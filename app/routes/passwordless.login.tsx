// Primary Imports
import { json, redirect } from "@remix-run/node";
import type { LinksFunction, LoaderFunction, ActionFunction } from "@remix-run/node";
import { Form, Link, useSearchParams, useLoaderData, useActionData } from "@remix-run/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { createFormValidityObserver } from "@form-observer/react";
import { parse, serialize } from "cookie";
import SuperTokensHelpers from "~/utils/supertokens/index.server";
import type { PasswordlessFlow } from "~/utils/supertokens/index.server";
import {
  createHeadersFromTokens,
  createHeadersFromPasswordlessCode,
  deviceCookieNames,
  deleteCookieSettings,
} from "~/utils/supertokens/cookieHelpers.server";
import { validateEmail, validatePhone } from "~/utils/validation";
import { commonRoutes } from "~/utils/constants";

// Styles
import authFormStyles from "~/styles/shared/auth-form.css?url";

/* -------------------- Browser -------------------- */
export default function PasswordlessLogin() {
  const [searchParams] = useSearchParams();
  const { mode, contact } = useLoaderData<typeof loader>();
  const serverErrors = useActionData<typeof action>();
  const [errors, setErrors] = useState(serverErrors);
  useEffect(() => setErrors(serverErrors), [serverErrors]); // Keep server/client errors in sync

  // Manage form errors
  const { autoObserve, configure, validateFields } = useMemo(() => {
    const required = (field: HTMLInputElement) => `${field.labels?.[0].textContent} is required`;

    return createFormValidityObserver("focusout", {
      renderByDefault: true,
      defaultErrors: { required },
      renderer(errorContainer, errorMessage) {
        const fieldName = errorContainer.id.replace(/-error$/, "");
        setErrors((e) => ({ ...e, [fieldName]: errorMessage }));
      },
    });
  }, []);

  const formRef = useMemo(autoObserve, [autoObserve]);
  const handleSubmit = useCallback(
    (event: React.FormEvent) => (validateFields({ focus: true }) ? undefined : event.preventDefault()),
    [validateFields],
  );

  // Note: Users will only get here if their Login Link is invalid
  if (mode === "link-signin") {
    return (
      <main>
        <div className="auth-card">
          <h1>Invalid Login Link</h1>
          <p>
            This login link is either expired or invalid. <br aria-hidden="true" />
            Please use a different one.
          </p>
        </div>
      </main>
    );
  }

  // TODO: Consider implementing a `resend` Link
  if (mode === "messaged") {
    return (
      <main>
        <div className="auth-card">
          <h1>{`Check Your ${contact === "email" ? "Email" : "Phone"}`}</h1>
          <p>{`A link was sent to your ${contact === "email" ? "email" : "phone"}. Use it to log in.`}</p>
        </div>
      </main>
    );
  }

  // TODO: Consider implementing a `resend` Button
  if (mode === "code-signin") {
    return (
      <main>
        <Form ref={formRef} method="post" onSubmit={handleSubmit}>
          <h1>Enter Verification Code</h1>
          <h2>{`A verification code was sent to your ${contact === "email" ? "email" : "phone"}`}</h2>

          <label htmlFor="code">Code</label>
          <input
            key="code"
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            required
            aria-invalid={!!errors?.code}
            aria-describedby="code-error"
          />
          <div id="code-error" role="alert">
            {errors?.code}
          </div>

          <input name="mode" type="hidden" value={mode} />
          <button type="submit">Sign In</button>
        </Form>
      </main>
    );
  }

  searchParams.set("contact", contact === "email" ? "phoneNumber" : "email");

  return (
    <main>
      <Form ref={formRef} method="post" onSubmit={handleSubmit}>
        <h1>Sign Up / Sign In</h1>
        <hr className="two-sided-margin" aria-hidden="true" />

        <div className="@flex @justify-between @items-center">
          <label htmlFor={contact}>{contact === "email" ? "Email" : "Phone Number"}</label>
          <Link to={`?${searchParams.toString()}`}>{`Use ${contact === "email" ? "a Phone Number" : "an Email"}`}</Link>
        </div>

        <input
          key="contact"
          id={contact}
          inputMode={contact === "phoneNumber" ? "numeric" : undefined}
          required
          aria-invalid={!!errors?.[contact]}
          aria-describedby={`${contact}-error`}
          {...configure(contact, {
            type: contact === "email" ? { value: "email", message: "Email is invalid" } : "text",
          })}
        />
        <div id={`${contact}-error`} role="alert">
          {errors?.[contact]}
        </div>

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">Continue</button>
      </Form>
    </main>
  );
}

export const links: LinksFunction = () => [{ rel: "stylesheet", href: authFormStyles }];

/* -------------------- Server -------------------- */
export const loader = (async ({ request, context }) => {
  if (context.user?.id) throw redirect("/", 303);

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  let mode: "request" | "code-signin" | "link-signin" | "messaged";

  if (token) mode = "link-signin";
  else if (searchParams.has("mode")) mode = searchParams.get("mode") as typeof mode;
  else mode = "request";

  if (token) await attemptSigninWith(request, token, true); // Note: Should redirect unless sign-in fails

  const contact: "email" | "phoneNumber" = searchParams.get("contact") === "phoneNumber" ? "phoneNumber" : "email";
  return json({ mode, contact });
}) satisfies LoaderFunction;

type FormErrors = Partial<{ banner: string; email: string; phoneNumber: string; code: string }>;
export const action = (async ({ request, context }) => {
  if (context.user?.id) throw redirect("/", 303);

  // Form Data
  const formData = Object.fromEntries(await request.formData()) as Record<string, string | null>;
  const { mode } = formData;

  if (mode === "request") {
    // Note: Type casting is just for convenience. We expect EITHER `email` OR `phoneNumber` to be provided. Not both.
    const { email, phoneNumber } = formData as Record<string, string>;

    // Only troublesome users will get here.
    if (email == null && phoneNumber == null) {
      return json<FormErrors>({ banner: "Please provide an email or a phone number" }, 400);
    }

    // Only troublesome users will get here too.
    if (email != null && phoneNumber != null) {
      return json<FormErrors>({ banner: "You may provide an email or a phone number, but not both" }, 400);
    }

    if (email != null) {
      if (!email) return json<FormErrors>({ email: "Email is required" }, 400);
      if (!validateEmail(email)) return json<FormErrors>({ email: "Email is invalid" }, 400);
    }

    if (phoneNumber != null) {
      if (!phoneNumber) return json<FormErrors>({ phoneNumber: "Phone Number is required" }, 400);
      if (!validatePhone(phoneNumber)) return json<FormErrors>({ phoneNumber: "Phone Number is invalid" }, 400);
    }

    // Send a code/link
    const flow: PasswordlessFlow = "both" as PasswordlessFlow; // Note: You can change this depending on your needs.
    const code = await SuperTokensHelpers.sendPasswordlessInvite({ email, phoneNumber, flow });

    // Redirect to relevant page (with Device Details), preserving `returnUrl` if it previously existed
    const headers = createHeadersFromPasswordlessCode(code);

    const url = new URL(request.url);
    url.searchParams.set("mode", flow === "link" ? "messaged" : "code-signin");
    if (flow === "link") url.searchParams.delete("returnUrl"); // `returnUrl` is no longer relevant in this case

    headers.set("Location", `${url.pathname}${url.search}`);
    throw new Response(null, { status: 303, statusText: "OK", headers });
  }

  if (mode === "code-signin") {
    const { code } = formData;
    return code ? attemptSigninWith(request, code) : json<FormErrors>({ code: "Code is required" }, 400);
  }

  // Fallthrough
  throw json({ error: "Invalid Request" }, 400);
}) satisfies ActionFunction;

// TODO: SuperTokens seems to `THROW` an error when there's a bad `preAuthSessionId`. This issue has been
// reported to the SuperTokens team and is unexpected behavior. We'll need to wait for them to supply a fix.
const deleteDeviceCookieSettings = { ...deleteCookieSettings, path: commonRoutes.loginPasswordless };

async function attemptSigninWith(request: Request, code: string, link?: boolean) {
  // Get Credentials
  const cookies = parse(request.headers.get("Cookie") ?? "");
  const deviceId = cookies[deviceCookieNames.deviceId] ?? "";
  const preAuthSessionId = cookies[deviceCookieNames.preAuthSessionId] ?? "";

  // Validate Code
  const credentials = link ? { linkCode: code, preAuthSessionId } : { userInputCode: code, deviceId, preAuthSessionId };
  const { status, tokens } = await SuperTokensHelpers.passwordlessSignin(credentials);

  // Auth Failed
  if (status === "RESTART_FLOW_ERROR") return json<FormErrors>({ banner: "Please request a new code" }, 401);
  if (status === "EXPIRED_USER_INPUT_CODE_ERROR") return json<FormErrors>({ code: "This code has expired" }, 401);
  if (status === "LINKING_TO_SESSION_USER_FAILED") return json<FormErrors>({ banner: "Account linking failed" }, 400);
  if (status !== "OK") return json<FormErrors>({ code: "Code is invalid " }, 401);

  // Auth succeeded. Set auth tokens and clear device data.
  const headers = createHeadersFromTokens(tokens);
  headers.append("Set-Cookie", serialize(deviceCookieNames.deviceId, "", deleteDeviceCookieSettings));
  headers.append("Set-Cookie", serialize(deviceCookieNames.preAuthSessionId, "", deleteDeviceCookieSettings));

  headers.set("Location", new URL(request.url).searchParams.get("returnUrl") || "/");
  throw new Response(null, { status: 303, statusText: "OK", headers });
}
