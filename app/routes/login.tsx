// Primary imports
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction, ActionFunction, LinksFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useActionData, useLocation } from "@remix-run/react";
import { useEffect } from "react";
import useFormErrors from "~/hooks/useFormErrors";
import { baseAuthUrl } from "~/utils/auth.server";
import { commonRoutes } from "~/utils/constants";

// Styles
import authFormStyles from "~/styles/shared/auth-form.css";
import styles from "~/styles/routes/login.css";

/* -------------------- Browser -------------------- */
export default function LoginPage() {
  // TODO: https://github.com/remix-run/remix/issues/3133
  const { pathname, search } = useLocation();
  const { mode, baseAuthUrl } = useLoaderData<LoaderData>();
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
              if (!value) return "Field is not optional";
              if (!/\S+@\S+\.\S+/.test(value)) return "Email is invalid";
              if (mode !== "signup") return;

              // Check email existence for `signup`s
              type EmailCheckData = { status: string; exists: boolean };
              const res = await fetch(`${baseAuthUrl}/signup/email/exists?email=${value}`);
              const emailExists = await res.json().then((body: EmailCheckData) => body.exists);
              if (emailExists) return "This email already exists. Please sign in instead";
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
              if (!value) return "Field is not optional";
              if (mode === "signup" && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value))
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
  baseAuthUrl: typeof baseAuthUrl;
}

export const loader: LoaderFunction = async ({ request, context }) => {
  if (context.user.id) return redirect("/");

  const loginMode = new URL(request.url).searchParams.get("mode");
  const mode = loginMode === "signup" ? "signup" : "signin";
  return json<LoaderData>({ mode, baseAuthUrl });
};

/** `SuperTokens` response _data_ during signin/signup */
type SuperTokensData =
  | { status: "WRONG_CREDENTIALS_ERROR" }
  | { status: "FIELD_ERROR"; formFields: [{ id: string; error: string }] }
  | { status: "OK"; user: { id: string; email: string; timeJoined: number } };

type ActionData = undefined | { banner?: string | null; email?: string | null; password?: string | null };

export const action: ActionFunction = async ({ request }) => {
  // Form Data
  const formData = await request.formData().then(Object.fromEntries);
  const { email, password, mode } = formData;

  const formFields = [
    { id: "email", value: email },
    { id: "password", value: password },
  ];

  // Attempt sign-in/sign-up
  const authResponse = await fetch(`${baseAuthUrl}/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formFields }),
  });

  const data: SuperTokensData = await authResponse.json();

  // Auth failed
  if (data.status !== "OK") {
    if (data.status === "WRONG_CREDENTIALS_ERROR") {
      return json<ActionData>({ banner: "Incorrect email and password combination" });
    }

    if (data.status === "FIELD_ERROR") {
      return json<ActionData>(data.formFields.reduce((errors, field) => ({ ...errors, [field.id]: field.error }), {}));
    }

    return json<ActionData>({ banner: "An unexpected error occurred; please try again." });
  }

  // Auth succeeded
  const headers = new Headers(authResponse.headers);
  headers.set("Location", new URL(request.url).searchParams.get("returnUrl") || "/");
  return new Response(null, { status: 302, statusText: "OK", headers });
};
