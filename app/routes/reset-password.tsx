// Primary Imports
import { json, redirect } from "@remix-run/node";
import type { LinksFunction, LoaderFunction, ActionFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useLocation, useActionData } from "@remix-run/react";
import { baseAuthUrl } from "~/utils/auth.server";

// Styles
import globalStyles from "~/styles/shared/global.css";
import authFormStyles from "~/styles/shared/auth-form.css";

/* -------------------- Browser -------------------- */
export default function ResetPassword() {
  // TODO: https://github.com/remix-run/remix/issues/3133
  const { pathname, search } = useLocation();
  const { mode, token } = useLoaderData<LoaderData>();
  const errors = useActionData<ActionData>();

  if (mode === "success") {
    return (
      <main>
        <div className="auth-card">
          <h1>Success!</h1>
          <p>Your password has been updated successfully</p>
          <Link className="btn" to="/login">
            SIGN IN
          </Link>
        </div>
      </main>
    );
  }

  if (mode === "attempt") {
    return (
      <main>
        <Form method="post" action={`${pathname}${search}`}>
          <h1>Change your password</h1>
          <h2>Enter a new password below to change your password</h2>
          {errors?.banner && <div role="alert">{errors.banner}</div>}

          <label htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="New password"
            aria-invalid={!!errors?.password}
            aria-errormessage="password-error"
          />
          {!!errors?.password && (
            <div id="password-error" role="alert">
              {errors.password}
            </div>
          )}

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            placeholder="Confirm your password"
            aria-invalid={!!errors?.["confirm-password"]}
            aria-errormessage="confirm-password-error"
          />
          {!!errors?.["confirm-password"] && (
            <div id="confirm-password-error" role="alert">
              {errors["confirm-password"]}
            </div>
          )}

          <input name="mode" type="hidden" value={mode} />
          {!!token && <input name="token" type="hidden" value={token} />}
          <button type="submit">CHANGE PASSWORD</button>
        </Form>
      </main>
    );
  }

  if (mode === "emailed") {
    return (
      <main>
        <div className="auth-card">
          Please check your email for the password recovery link. <Link to="">Resend</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Form method="post">
        <h1>Reset your password</h1>
        <h2>We will send you an email to reset your password</h2>
        {errors?.banner && <div role="alert">{errors.banner}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          aria-invalid={!!errors?.email}
          aria-errormessage="email-error"
        />
        {!!errors?.email && (
          <div id="email-error" role="alert">
            {errors.email}
          </div>
        )}

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">Email me</button>
      </Form>
    </main>
  );
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
  { rel: "stylesheet", href: authFormStyles },
];

/* -------------------- Server -------------------- */
interface LoaderData {
  mode: "request" | "emailed" | "attempt" | "success";
  /** Token used for resetting a user's password */
  token: string | null;
}

export const loader: LoaderFunction = async ({ request, context }) => {
  if (context.user.id) return redirect("/");

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  let mode: LoaderData["mode"];

  if (token) mode = "attempt";
  else if (searchParams.has("mode")) mode = searchParams.get("mode") as typeof mode;
  else mode = "request";

  return json<LoaderData>({ mode, token });
};

/** `SuperTokens` response _data_ during signin/signup */
type SuperTokensData =
  | { status: "OK" }
  | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
  | { status: "FIELD_ERROR"; formFields: [{ id: string; error: string }] };

type ActionData =
  | undefined
  | {
      banner?: string | null;
      email?: string | null;
      password?: string | null;
      "confirm-password"?: string | null;
    };

export const action: ActionFunction = async ({ request, context }) => {
  if (context.user.id) return redirect("/");

  const formData = await request.formData().then(Object.fromEntries);
  const { mode } = formData;

  // Request an email to reset password
  if (mode === "request") {
    // Form Data
    const { email } = formData;
    const formFields = [{ id: "email", value: email }];

    // Attempt to request reset email
    const authResponse = await fetch(`${baseAuthUrl}/user/password/reset/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formFields }),
    });

    const data: SuperTokensData = await authResponse.json();

    // Email request failed
    if (data.status !== "OK") {
      if (data.status === "FIELD_ERROR") {
        return json<ActionData>(
          data.formFields.reduce((errors, field) => ({ ...errors, [field.id]: field.error }), {})
        );
      }

      console.log("SuperTokens Error Response: ", data);
      return json<ActionData>({ banner: "An unexpected error occurred; please try again." });
    }

    // Email request succeeded
    const headers = new Headers(authResponse.headers);
    headers.set("Location", "/reset-password?mode=emailed");
    return new Response(null, { status: 302, statusText: "OK", headers });
  }

  // Reset password
  if (mode === "attempt") {
    // Form Data
    const { password, "confirm-password": confirmPassword, token } = formData;
    const formFields = [{ id: "password", value: password }];

    const errors: ActionData = {};
    if (password !== confirmPassword) {
      errors["confirm-password"] = "Confirmation password doesn't match";
    }
    if (!password) errors.password = "Field is not optional";
    if (!confirmPassword) errors["confirm-password"] = "Field is not optional"; // Overrides first error

    if (errors.password || errors["confirm-password"]) return json<ActionData>(errors);

    // Attempt to reset password
    const authResponse = await fetch(`${baseAuthUrl}/user/password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formFields, token, method: "token" }),
    });

    const data: SuperTokensData = await authResponse.json();

    // Password reset failed
    if (data.status !== "OK") {
      if (data.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
        return json<ActionData>({ banner: "Invalid password reset token" });
      }

      if (data.status === "FIELD_ERROR") {
        return json<ActionData>(
          data.formFields.reduce((errors, field) => ({ ...errors, [field.id]: field.error }), {})
        );
      }

      console.log("SuperTokens Error Response: ", data);
      return json<ActionData>({ banner: "An unexpected error occurred; please try again." });
    }

    // Password reset succeeded
    const headers = new Headers(authResponse.headers);
    headers.set("Location", "/reset-password?mode=success");
    return new Response(null, { status: 302, statusText: "OK", headers });
  }

  // Fallthrough
  return json({ misc: "Invalid Request" });
};
