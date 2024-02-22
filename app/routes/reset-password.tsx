// Primary Imports
import { json, redirect } from "@remix-run/node";
import type { LinksFunction, LoaderFunction, ActionFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useActionData } from "@remix-run/react";
import { useEffect, useMemo } from "react";
import { useFormValidityObserver } from "@form-observer/react";
import type { ValidatableField } from "@form-observer/react";
import SuperTokensHelpers from "~/utils/supertokens/index.server";
import { validateEmail, validatePassword } from "~/utils/validation";
import { commonRoutes } from "~/utils/constants";

// Styles
import authFormStyles from "~/styles/shared/auth-form.css";

/* -------------------- Browser -------------------- */
export default function ResetPassword() {
  const { mode, token } = useLoaderData<LoaderData>();
  const errors = useActionData<ActionData>();

  // Manage form errors.
  const { autoObserve, configure, setFieldError, clearFieldError, validateField, validateFields } =
    useFormValidityObserver("focusout");
  const required = (field: ValidatableField) => `${field.labels?.[0].textContent} is required`;

  const formRef = useMemo(autoObserve, [autoObserve]);
  const handleSubmit = (event: React.FormEvent) => (validateFields() ? undefined : event.preventDefault());

  useEffect(() => {
    const form = document.querySelector("form");
    if (!form) return;

    Array.prototype.forEach.call(form.elements, (field: HTMLInputElement) => {
      const message = errors?.[field.name as keyof typeof errors];
      return message == null ? clearFieldError(field.name) : setFieldError(field.name, message);
    });
  }, [errors, setFieldError, clearFieldError]);

  if (mode === "success") {
    return (
      <main>
        <div className="auth-card">
          <h1>Success!</h1>
          <p>Your password has been updated successfully</p>
          <Link className="btn" to={commonRoutes.login}>
            SIGN IN
          </Link>
        </div>
      </main>
    );
  }

  if (mode === "attempt") {
    return (
      <main>
        <Form ref={formRef} method="post" onSubmit={handleSubmit}>
          <h1>Change your password</h1>
          <h2>Enter a new password below to change your password</h2>
          {errors?.banner && <div role="alert">{errors?.banner}</div>}

          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            placeholder="New password"
            aria-invalid={!!errors?.password}
            aria-describedby="password-error"
            {...configure("password", {
              required,
              pattern: {
                value: "(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}",
                message: "Password must contain at least 8 characters, including a number",
              },
              validate(input: HTMLInputElement) {
                const confirmPassword = input.form?.elements.namedItem("confirm-password") as HTMLInputElement;
                if (confirmPassword.value) validateField(confirmPassword.name);
              },
            })}
          />
          <div id="password-error" role="alert">
            {errors?.password}
          </div>

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            aria-invalid={!!errors?.["confirm-password"]}
            aria-describedby="confirm-password-error"
            {...configure("confirm-password", {
              required,
              validate(input: HTMLInputElement) {
                const password = input.form?.elements.namedItem("password") as HTMLInputElement;
                if (input.value !== password.value) return "Confirmation Password doesn't match";
              },
            })}
          />
          <div id="confirm-password-error" role="alert">
            {errors?.["confirm-password"]}
          </div>

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
      <Form ref={formRef} method="post" onSubmit={handleSubmit}>
        <h1>Reset your password</h1>
        <h2>We will send you an email to reset your password</h2>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          aria-invalid={!!errors?.email}
          aria-describedby="email-error"
          {...configure("email", { required, type: { value: "email", message: "Email is invalid" } })}
        />
        <div id="email-error" role="alert">
          {errors?.email}
        </div>

        <input name="mode" type="hidden" value={mode} />
        <button type="submit">Email me</button>
      </Form>
    </main>
  );
}

export const links: LinksFunction = () => [{ rel: "stylesheet", href: authFormStyles }];

/* -------------------- Server -------------------- */
interface LoaderData {
  mode: "request" | "emailed" | "attempt" | "success";
  /** Token used for resetting a user's password */
  token: string | null;
}

export const loader: LoaderFunction = async ({ request, context }) => {
  if (context.user?.id) return redirect("/", 303);

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  let mode: LoaderData["mode"];

  if (token) mode = "attempt";
  else if (searchParams.has("mode")) mode = searchParams.get("mode") as typeof mode;
  else mode = "request";

  return json<LoaderData>({ mode, token });
};

type ActionData =
  | undefined
  | {
      banner?: string | null;
      email?: string | null;
      password?: string | null;
      "confirm-password"?: string | null;
    };

export const action: ActionFunction = async ({ request, context }) => {
  if (context.user?.id) return redirect("/", 303);

  const formData = await request.formData().then(Object.fromEntries);
  const { mode } = formData;

  // Email a "reset password" link to user
  if (mode === "request") {
    // Form Data
    const { email } = formData;
    if (!email) return json<ActionData>({ email: "Email is required" }, 400);
    else if (!validateEmail(email)) return json<ActionData>({ email: "Email is invalid" }, 400);

    // Email a "reset password" link (or fail silently for invalid users/emails)
    await SuperTokensHelpers.sendPasswordResetEmail(email);
    const headers = new Headers({ Location: `${commonRoutes.resetPassword}?mode=emailed` });
    return new Response(null, { status: 303, statusText: "OK", headers });
  }

  // Reset user's password
  if (mode === "attempt") {
    // Form Data
    const { password, "confirm-password": confirmPassword, token = "" } = formData;

    // Validate Data
    const errors: ActionData = {};
    if (!password) errors.password = "Password is required";
    else if (!validatePassword(password)) {
      errors.password = "Password must contain at least 8 characters, including a number";
    }

    if (!confirmPassword) errors["confirm-password"] = "Confirmation Password is required";
    else if (password !== confirmPassword) errors["confirm-password"] = "Confirmation Password doesn't match";

    if (errors.password || errors["confirm-password"]) return json<ActionData>(errors, 400);

    // Validate Token
    if (!token) return json<ActionData>({ banner: "Invalid password reset link" }, 401);

    const status = await SuperTokensHelpers.resetPassword(token, password);
    if (status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
      return json<ActionData>({ banner: "Invalid password reset link" }, 401);
    }

    // Password reset succeeded
    const headers = new Headers({ Location: `${commonRoutes.resetPassword}?mode=success` });
    return new Response(null, { status: 303, statusText: "OK", headers });
  }

  // Fallthrough
  return json({ error: "Invalid Request" }, 400);
};
