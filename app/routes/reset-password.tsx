// Primary Imports
import type { LinksFunction } from "@remix-run/node";

// Styles
import globalStyles from "~/styles/shared/global.css";
import authFormStyles from "~/styles/shared/auth-form.css";

export default function ResetPassword() {
  return (
    <main>
      <form>
        <h1>Reset your password</h1>
        <h2>We will send you an email to reset your password</h2>

        <label htmlFor="email">Email</label>
        <input id="email" type="email" />

        <button type="submit">Email me</button>
      </form>
    </main>
  );
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
  { rel: "stylesheet", href: authFormStyles },
];
