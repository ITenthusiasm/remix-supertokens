// Primary imports
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction, ActionFunction, LinksFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useActionData } from "@remix-run/react";
import { useEffect, useMemo } from "react";
import { useFormValidityObserver } from "@form-observer/react";
import type { ValidatableField } from "@form-observer/react";
import SuperTokensHelpers from "~/utils/supertokens/index.server";
import { createHeadersFromTokens } from "~/utils/supertokens/cookieHelpers.server";
import { validateEmail, validatePassword } from "~/utils/validation";
import { commonRoutes } from "~/utils/constants";

// Styles
import authFormStyles from "~/styles/shared/auth-form.css?url";
import styles from "~/styles/routes/login.css?url";

/* -------------------- Browser -------------------- */
export default function LoginPage() {
  const { mode } = useLoaderData<LoaderData>();
  const errors = useActionData<ActionData>();

  // Manage form errors.
  const { autoObserve, configure, setFieldError, clearFieldError } = useFormValidityObserver("focusout");
  const required = (field: ValidatableField) => `${field.labels?.[0].textContent} is required`;

  useEffect(() => {
    const form = document.querySelector("form") as HTMLFormElement;
    Array.prototype.forEach.call(form.elements, (field: HTMLInputElement) => {
      const message = errors?.[field.name as keyof typeof errors];
      return message == null ? clearFieldError(field.name) : setFieldError(field.name, message);
    });
  }, [errors, setFieldError, clearFieldError]);

  // Clear errors whenever the authentication mode changes.
  useEffect(() => {
    clearFieldError("email");
    clearFieldError("password");
  }, [mode, clearFieldError]);

  return (
    <main>
      <Form ref={useMemo(autoObserve, [autoObserve])} method="post">
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
        {errors?.banner && <div role="alert">{errors.banner}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          placeholder="Email Address"
          aria-invalid={!!errors?.email}
          aria-describedby="email-error"
          {...configure("email", {
            required,
            type: { value: "email", message: "Email is invalid" },
            async validate({ value }: HTMLInputElement) {
              // Check email existence for `signup`s
              if (mode !== "signup") return;

              const response = await fetch(`/api/email-exists?email=${value}`);
              const emailExists = await response.json().then((body: boolean) => body);
              if (emailExists) return "This email already exists. Please sign in instead.";
            },
          })}
        />
        <div id="email-error" role="alert">
          {errors?.email}
        </div>

        <label htmlFor="password">Password</label>
        <input
          id="password"
          placeholder="Password"
          type="password"
          aria-invalid={!!errors?.password}
          aria-describedby="password-error"
          {...configure("password", {
            required,
            pattern:
              mode === "signin"
                ? undefined
                : {
                    value: "(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}",
                    message: "Password must contain at least 8 characters, including a number",
                  },
          })}
        />
        <div id="password-error" role="alert">
          {errors?.password}
        </div>

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
  if (context.user?.id) return redirect("/", 303);

  const loginMode = new URL(request.url).searchParams.get("mode");
  const mode = loginMode === "signup" ? "signup" : "signin";
  return json<LoaderData>({ mode });
};

type ActionData = undefined | { banner?: string | null; email?: string | null; password?: string | null };

export const action: ActionFunction = async ({ request, context }) => {
  if (context.user?.id) return redirect("/", 303);

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
  const { status, tokens } = await SuperTokensHelpers[normalizedMode](email, password);

  // Auth failed
  if (status === "WRONG_CREDENTIALS_ERROR") {
    return json<ActionData>({ banner: "Incorrect email and password combination" }, 401);
  }

  if (status === "EMAIL_ALREADY_EXISTS_ERROR") {
    return json<ActionData>({ email: "This email already exists. Please sign in instead." }, 400);
  }

  // Auth succeeded
  const headers = createHeadersFromTokens(tokens);
  headers.set("Location", new URL(request.url).searchParams.get("returnUrl") || "/");
  return new Response(null, { status: 303, statusText: "OK", headers });
};
