// Primary Imports
import { json, redirect } from "@remix-run/node";
import type { LinksFunction, LoaderFunction, ActionFunction } from "@remix-run/node";
import { Form, Link, useLoaderData, useLocation } from "@remix-run/react";

// Styles
import globalStyles from "~/styles/shared/global.css";
import authFormStyles from "~/styles/shared/auth-form.css";

/* -------------------- Browser -------------------- */
export default function ResetPassword() {
  // TODO: https://github.com/remix-run/remix/issues/3133
  const { pathname, search } = useLocation();
  const { mode, token } = useLoaderData<LoaderData>();

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

          <label>New password</label>
          <input name="password" type="password" placeholder="New password" />

          <label>Confirm password</label>
          <input name="confirm-password" type="password" placeholder="Confirm your password" />

          <input name="mode" type="hidden" value={mode} />
          {token && <input name="token" type="hidden" value={token} />}
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

        <label htmlFor="email">Email</label>
        <input name="email" type="email" />
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

  if (searchParams.has("token")) mode = "attempt";
  else if (searchParams.has("mode")) mode = searchParams.get("mode") as typeof mode;
  else mode = "request";

  return json<LoaderData>({ mode, token });
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

    // URL Data
    const domain = process.env.DOMAIN;
    const baseUrl = `${domain}${process.env.SUPERTOKENS_API_BASE_PATH}/user/password/reset/token`;

    // Attempt to request reset email
    const authResponse = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formFields }),
    });

    if (authResponse.status !== 200) {
      const errorInfo = await authResponse.json();
      console.log(errorInfo);

      return json<unknown>({
        errors: { email: "Your request for a password reset link failed to go through." },
      });
    }

    // Response was successful
    const remixHeaders = new Headers(authResponse.headers);
    remixHeaders.set("Location", "/reset-password?mode=emailed");

    const remixResponse = new Response(authResponse.body, {
      status: 302,
      statusText: "OK",
      headers: remixHeaders,
    });

    return remixResponse;
  }
  // Reset password
  else if (mode === "attempt") {
    // Form Data
    const { password, "confirm-password": confirmPassword, token } = formData;
    const formFields = [{ id: "password", value: password }];

    if (password !== confirmPassword) {
      return json({
        errors: { "confirm-password": "Confirmation password doesn't match" },
      });
    }

    // URL Data
    const domain = process.env.DOMAIN;
    const baseUrl = `${domain}${process.env.SUPERTOKENS_API_BASE_PATH}/user/password/reset`;

    // Attempt to reset email
    const authResponse = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formFields, token, method: "token" }),
    });

    if (authResponse.status !== 200) {
      const errorInfo = await authResponse.json();
      console.log(errorInfo);

      return json<unknown>({
        errors: { password: "Unable to successfully reset password" },
      });
    }

    // Response was successful
    const remixHeaders = new Headers(authResponse.headers);
    remixHeaders.set("Location", "/reset-password?mode=success");

    const remixResponse = new Response(authResponse.body, {
      status: 302,
      statusText: "OK",
      headers: remixHeaders,
    });

    return remixResponse;
  }
  // Fallthrough
  else {
    return json({ errors: { misc: "Invalid Request" } });
  }
};
