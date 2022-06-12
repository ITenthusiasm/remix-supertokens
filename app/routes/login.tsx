// Primary imports
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction, ActionFunction, LinksFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useActionData, useLocation } from "@remix-run/react";

// Styles
import globalStyles from "~/styles/shared/global.css";
import authFormStyles from "~/styles/shared/auth-form.css";
import styles from "~/styles/login.css";

/* -------------------- Browser -------------------- */
export default function LoginPage() {
  // TODO: https://github.com/remix-run/remix/issues/3133
  const { pathname, search } = useLocation();
  const { mode } = useLoaderData<LoaderData>();
  const errors = useActionData<ActionData>();

  return (
    <main>
      <Form method="post" action={`${pathname}${search}`}>
        <h1>Sign {mode === "signin" ? "In" : "Up"}</h1>

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

        {errors?.banner && <div role="alert">{errors.banner}</div>}

        <label htmlFor="email">Email</label>
        <input
          name="email"
          placeholder="Email Address"
          type="email"
          aria-invalid={!!errors?.email}
          aria-errormessage="email-error"
        />
        {!!errors?.email && (
          <div id="email-error" role="alert">
            {errors.email}
          </div>
        )}

        <label htmlFor="password">Password</label>
        <input
          name="password"
          placeholder="Password"
          type="password"
          aria-invalid={!!errors?.password}
          aria-errormessage="password-error"
        />
        {!!errors?.password && (
          <div id="password-error" role="alert">
            {errors.password}
          </div>
        )}

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">Sign {mode === "signin" ? "In" : "Up"}</button>

        {mode !== "signup" && (
          <Link className="forgot-password" to="/reset-password">
            Forgot password?
          </Link>
        )}
      </Form>
    </main>
  );
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
  { rel: "stylesheet", href: authFormStyles },
  { rel: "stylesheet", href: styles },
];

/* -------------------- Server -------------------- */
interface LoaderData {
  mode: "signin" | "signup";
}

export const loader: LoaderFunction = async ({ request, context }) => {
  if (context.user.id) return redirect("/");

  const loginMode = new URL(request.url).searchParams.get("mode");
  const mode = loginMode === "signup" ? "signup" : "signin";
  return json<LoaderData>({ mode });
};

/** `SuperTokens` response during signin/signup */
type STAuthResponse =
  | { status: "WRONG_CREDENTIALS_ERROR" }
  | { status: "FIELD_ERROR"; formFields: [{ id: string; error: string }] }
  | { status: "OK"; user: { id: string; email: string; timeJoined: number } };

type ActionData =
  | undefined
  | { banner?: string | null; email?: string | null; password?: string | null };

export const action: ActionFunction = async ({ request }) => {
  // Form Data
  const formData = await request.formData().then(Object.fromEntries);
  const { email, password, mode } = formData;

  const formFields = [
    { id: "email", value: email },
    { id: "password", value: password },
  ];

  // URL Data
  const domain = process.env.DOMAIN;
  const baseUrl = `${domain}${process.env.SUPERTOKENS_API_BASE_PATH}/${mode}`;

  // Attempt sign-in/sign-up
  const authResponse = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formFields }),
  });

  // Auth failed
  const data: STAuthResponse = await authResponse.json();
  if (data.status !== "OK") {
    if (data.status === "WRONG_CREDENTIALS_ERROR") {
      return json<ActionData>({ banner: "Incorrect email and password combination" });
    }

    if (data.status === "FIELD_ERROR") {
      return json<ActionData>(
        data.formFields.reduce((errors, field) => ({ ...errors, [field.id]: field.error }), {})
      );
    }

    return json<ActionData>({ banner: "An unexpected error occurred; please try again." });
  }

  // Auth succeeded
  const remixHeaders = new Headers(authResponse.headers);
  remixHeaders.set("Location", "/");

  const remixResponse = new Response(authResponse.body, {
    status: 302,
    statusText: "OK",
    headers: remixHeaders,
  });

  return remixResponse;
};
