// Primary imports
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction, ActionFunction, LinksFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useActionData, useLocation } from "@remix-run/react";
import { useEffect } from "react";
import useFormErrors from "~/hooks/useFormErrors";
import { SuperTokensHelpers } from "~/utils/supertokens/index.server";
import { validateEmail, validatePassword } from "~/utils/validation";
import { commonRoutes } from "~/utils/constants";

// Styles
import authFormStyles from "~/styles/shared/auth-form.css";
import styles from "~/styles/routes/login.css";

/* -------------------- Browser -------------------- */
export default function LoginPage() {
  // TODO: https://github.com/remix-run/remix/issues/3133
  const { pathname, search } = useLocation();
  const { mode } = useLoaderData<LoaderData>();
  const serverErrors = useActionData<ActionData>();

  // Manage form errors. Clear errors whenever the authentication mode changes.
  const { register, handleSubmit, clearErrors, errors } = useFormErrors(serverErrors);
  useEffect(clearErrors, [mode, clearErrors]);

  return (
    <main>
      <Form method="post" action={`${pathname}${search}`} onSubmit={handleSubmit}>
        <h1>{`Sign ${mode === "signin" ? "In" : "Up"}`}</h1>

        {mode === "signin" ? (
          <h2>
            Not registered yet? <Link to="?mode=signup">Sign Up</Link>
          </h2>
        ) : (
          <h2>
            Already have an account? <Link to="">Sign In</Link>
          </h2>
        )}

        <hr />
        {serverErrors?.banner && <div role="alert">{serverErrors.banner}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          placeholder="Email Address"
          type="email"
          aria-invalid={!!errors?.email}
          aria-errormessage="email-error"
          {...register("email", {
            async validate(value) {
              // Check field
              if (!value) return "Email is required";
              if (!validateEmail(value)) return "Email is invalid";
              if (mode !== "signup") return;

              // Check email existence for `signup`s
              const response = await fetch(`/api/email-exists?email=${value}`);
              const emailExists = await response.json().then((body: boolean) => body);
              if (emailExists) return "This email already exists. Please sign in instead.";
            },
          })}
        />
        {!!errors?.email && (
          <div id="email-error" role="alert">
            {errors.email.message}
          </div>
        )}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          placeholder="Password"
          type="password"
          aria-invalid={!!errors?.password}
          aria-errormessage="password-error"
          {...register("password", {
            validate(value) {
              if (!value) return "Password is required";
              if (mode === "signup" && !validatePassword(value))
                return "Password must contain at least 8 characters, including a number";
            },
          })}
        />
        {!!errors?.password && (
          <div id="password-error" role="alert">
            {errors.password.message}
          </div>
        )}

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">{`Sign ${mode === "signin" ? "In" : "Up"}`}</button>

        {mode === "signin" && (
          <Link className="forgot-password" to={commonRoutes.resetPassword}>
            Forgot password?
          </Link>
        )}
      </Form>
    </main>
  );
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: authFormStyles },
  { rel: "stylesheet", href: styles },
];

/* -------------------- Server -------------------- */
interface LoaderData {
  mode: "signin" | "signup";
}

export const loader: LoaderFunction = async ({ request, context }) => {
  if ((context as RemixContext).user?.id) return redirect("/");

  const loginMode = new URL(request.url).searchParams.get("mode");
  const mode = loginMode === "signup" ? "signup" : "signin";
  return json<LoaderData>({ mode });
};

type ActionData = undefined | { banner?: string | null; email?: string | null; password?: string | null };

export const action: ActionFunction = async ({ request }) => {
  // Form Data
  const formData = await request.formData().then(Object.fromEntries);
  const { email, password, mode } = formData;

  // Validate Data
  const errors: ActionData = {};
  if (!email) errors.email = "Email is required";
  else if (!validateEmail(email)) errors.email = "Email is invalid";

  if (!password) errors.password = "Password is required";
  else if (mode === "signup" && !validatePassword(password)) {
    errors.password = "Password must contain at least 8 characters, including a number";
  }

  if (errors.email || errors.password) return json<ActionData>(errors, 400);

  // Attempt Sign In / Sign Up
  const normalizedMode: LoaderData["mode"] = mode === "signup" ? "signup" : "signin";
  const { status, responseHeaders } = await SuperTokensHelpers[normalizedMode](email, password);

  // Auth failed
  if (status === "WRONG_CREDENTIALS_ERROR") {
    return json<ActionData>({ banner: "Incorrect email and password combination" }, 401);
  }

  if (status === "EMAIL_ALREADY_EXISTS_ERROR") {
    return json<ActionData>({ email: "This email already exists. Please sign in instead." }, 400);
  }

  // Auth succeeded
  responseHeaders.set("Location", new URL(request.url).searchParams.get("returnUrl") || "/");
  return new Response(null, { status: 302, statusText: "OK", headers: responseHeaders });
};
