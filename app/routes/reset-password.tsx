// Primary Imports
import { json, redirect } from "@remix-run/node";
import type { LinksFunction, LoaderFunction, ActionFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useLocation, useActionData } from "@remix-run/react";
import { useEffect } from "react";
import useFormErrors from "~/hooks/useFormErrors";
import { SuperTokensHelpers } from "~/utils/supertokens/index.server";
import { validateEmail, validatePassword, emailRegex } from "~/utils/validation";
import { commonRoutes } from "~/utils/constants";

// Styles
import authFormStyles from "~/styles/shared/auth-form.css";

/* -------------------- Browser -------------------- */
export default function ResetPassword() {
  // TODO: https://github.com/remix-run/remix/issues/3133
  const { pathname, search } = useLocation();
  const { mode, token } = useLoaderData<LoaderData>();
  const serverErrors = useActionData<ActionData>();

  // Manage form errors. Clear errors whenever the reset-password mode changes.
  const { register, handleSubmit, clearErrors, trigger, errors } = useFormErrors(serverErrors);
  useEffect(clearErrors, [mode, clearErrors]);

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
        <Form method="post" action={`${pathname}${search}`} onSubmit={handleSubmit}>
          <h1>Change your password</h1>
          <h2>Enter a new password below to change your password</h2>
          {serverErrors?.banner && <div role="alert">{serverErrors?.banner}</div>}

          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            placeholder="New password"
            aria-invalid={!!errors?.password}
            aria-errormessage="password-error"
            {...register("password", {
              validate(value) {
                const inputName = "confirm-password";
                const confirm = document.querySelector(`[name='${inputName}']`) as HTMLInputElement;
                if (confirm.value) trigger(inputName);

                if (!value) return "Password is required";
                if (!validatePassword(value)) return "Password must contain at least 8 characters, including a number";
              },
            })}
          />
          {!!errors?.password && (
            <div id="password-error" role="alert">
              {errors.password.message}
            </div>
          )}

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            aria-invalid={!!errors?.["confirm-password"]}
            aria-errormessage="confirm-password-error"
            {...register("confirm-password", {
              required: "Confirmation password is required",
              validate(value) {
                const password = document.querySelector("[name='password']") as HTMLInputElement;
                if (value !== password.value) return "Confirmation password doesn't match";
              },
            })}
          />
          {!!errors?.["confirm-password"] && (
            <div id="confirm-password-error" role="alert">
              {errors["confirm-password"].message}
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
      <Form method="post" onSubmit={handleSubmit}>
        <h1>Reset your password</h1>
        <h2>We will send you an email to reset your password</h2>
        {serverErrors?.banner && <div role="alert">{serverErrors?.banner}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          aria-invalid={!!errors?.email}
          aria-errormessage="email-error"
          {...register("email", {
            required: "Email is required",
            pattern: { value: emailRegex, message: "Email is invalid" },
          })}
        />
        {!!errors?.email && (
          <div id="email-error" role="alert">
            {errors.email.message}
          </div>
        )}

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
  if ((context as RemixContext).user?.id) return redirect("/");

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
  if ((context as RemixContext).user?.id) return redirect("/");

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
    return new Response(null, { status: 302, statusText: "OK", headers });
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
    else if (password !== confirmPassword) errors["confirm-password"] = "Confirmation password doesn't match";

    if (errors.password || errors["confirm-password"]) return json<ActionData>(errors, 400);

    // Validate Token
    if (!token) return json<ActionData>({ banner: "Invalid password reset link" }, 401);

    const status = await SuperTokensHelpers.resetPassword(token, password);
    if (status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
      return json<ActionData>({ banner: "Invalid password reset link" }, 401);
    }

    // Password reset succeeded
    const headers = new Headers({ Location: `${commonRoutes.resetPassword}?mode=success` });
    return new Response(null, { status: 302, statusText: "OK", headers });
  }

  // Fallthrough
  return json({ error: "Invalid Request" }, 400);
};
