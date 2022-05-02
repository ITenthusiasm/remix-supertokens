// Primary imports
import type { LinksFunction } from "@remix-run/node";
import { Form, Link } from "@remix-run/react";
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
        <input id="email" placeholder="Email Address" type="email" />

        <label htmlFor="password">Password</label>
        <input id="password" placeholder="Password" type="password" />

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
