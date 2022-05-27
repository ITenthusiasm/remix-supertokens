// Primary imports
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction, ActionFunction, LinksFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useActionData } from "@remix-run/react";
import { useState, useCallback } from "react";

// Styles
import globalStyles from "~/styles/shared/global.css";
import authFormStyles from "~/styles/shared/auth-form.css";
import styles from "~/styles/login.css";

export default function LoginPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const toggleMode = useCallback(
    () => setMode((mode) => (mode === "sign-in" ? "sign-up" : "sign-in")),
    []
  );

  return (
    <main>
      <Form method="post">
        <h1>Sign {mode === "sign-in" ? "In" : "Up"}</h1>

        {mode === "sign-in" ? (
          <h2>
            Not registered yet?{" "}
            <span className="link-like" onClick={toggleMode}>
              Sign Up
            </span>
          </h2>
        ) : (
          <h2>
            Already have an account?{" "}
            <span className="link-like" onClick={toggleMode}>
              Sign In
            </span>
          </h2>
        )}

        <hr />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" placeholder="Email Address" type="email" />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" placeholder="Password" type="password" />

        <input name="mode" type="hidden" value={mode.replace(/-/g, "")} />
        <button type="submit">Sign {mode === "sign-in" ? "In" : "Up"}</button>

        {mode !== "sign-up" && (
          <Link className="link-like-dark" to="reset-password">
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

export const loader: LoaderFunction = async ({ request, context }) => {
  if (context.user.id) return redirect("/");

  const url = new URL(request.url);
  // console.log("Search New: ", url.searchParams.has("new"));
  return null;
};

interface ActionData {
  errors?: {
    email?: string | null;
  };
}

export const action: ActionFunction = async ({ request }) => {
  // Form Data
  const formData = await request.formData().then(Object.fromEntries);
  const { email, password, mode } = formData;

  const formFields = [
    { id: "email", value: email },
    { id: "password", value: password },
  ];

  // URL Data
  const domain = `http://localhost:3000`;
  const baseUrl = `${domain}${process.env.SUPERTOKENS_API_BASE_PATH}/${mode}`;

  // Check if email already exists on sign-up
  if (mode === "signup") {
    const emailCheckResponse = await fetch(`${baseUrl}/email/exists?email=${email}`);
    const emailDetails = (await emailCheckResponse.json()) as { exists: boolean };

    if (emailDetails.exists) return json<ActionData>({ errors: { email: "Email already exists" } });
  }

  // Attempt sign-in/sign-up
  const authResponse = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formFields }),
  });

  if (authResponse.status !== 200) {
    const errorInfo = await authResponse.json();
    console.log(errorInfo);

    return json<ActionData>({
      errors: { email: "Your auth attempt didn't work for some reason " },
    });
  }

  // Response was successful
  const remixHeaders = new Headers(authResponse.headers);
  remixHeaders.set("Location", "/");

  const remixResponse = new Response(authResponse.body, {
    status: 302,
    statusText: "OK",
    headers: remixHeaders,
  });

  return remixResponse;
};
