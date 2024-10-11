// Primary Imports
import { json, redirect } from "@remix-run/node";
import type { LinksFunction, LoaderFunction, ActionFunction } from "@remix-run/node";
import { Form, useLoaderData, useActionData } from "@remix-run/react";
import { parse, serialize } from "cookie";
import SuperTokensHelpers from "~/utils/supertokens/index.server";
import { createCookieSettings, createHeadersFromTokens } from "~/utils/supertokens/cookieHelpers.server";

// Styles
import authFormStyles from "~/styles/shared/auth-form.css?url";

/* -------------------- Browser -------------------- */
export default function ThirdPartyLogin() {
  const loaderErrors = useLoaderData<typeof loader>();
  const actionErrors = useActionData<typeof action>();
  const error = loaderErrors?.banner ?? actionErrors?.banner;

  return (
    <main>
      <Form method="post">
        <h1>Sign In / Sign Up</h1>
        <hr />
        {error && <div role="alert">{error}</div>}

        {/* TODO: A flexbox would be helpful here. Maybe an unordered list? */}
        {/* TODO: Add better buttons/icons for the OAuth Providers */}
        <button name="provider" type="submit" value="github">
          Continue with GitHub
        </button>
      </Form>
    </main>
  );
}

export const links: LinksFunction = () => [{ rel: "stylesheet", href: authFormStyles }];

/* -------------------- Server -------------------- */
const pkceCookieName = "sPKCE";
type Errors = Partial<{ banner: string }>;

export const loader = (async ({ request, context }) => {
  if (context.user?.id) throw redirect("/", 303);

  const url = new URL(request.url);
  const { searchParams } = url;

  // User is visiting Login Page
  if (!searchParams.has("provider")) return null;

  // User is being redirected from Provider's Login Page
  const cookies = request.headers.get("Cookie") ?? "";
  const pkceCodeVerifier = parse(cookies)[pkceCookieName];
  const { status, tokens } = await SuperTokensHelpers.thirdPartySignin(searchParams, pkceCodeVerifier);

  // Auth Failed
  if (status === "UNRECOGNIZED_PROVIDER") return json<Errors>({ banner: "Provider was not recognized" }, 400);
  if (status === "NO_EMAIL_FOUND_FOR_USER") return json<Errors>({ banner: "Account lacks a valid email" }, 400);
  if (status === "EMAIL_NOT_VERIFIED") return json<Errors>({ banner: "Email not verified with provider" }, 403);
  if (status === "SIGN_IN_UP_NOT_ALLOWED") return json<Errors>({ banner: "Account was rejected" }, 403);
  if (status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
    return json<Errors>({ banner: "Unsupported email change detected" }, 403);
  }

  // Either our implementation is incorrect, or an error status was not handled properly.
  if (status !== "OK") return json<Errors>({ banner: "Authorization failed" }, 500);

  // Auth succeeded
  const headers = createHeadersFromTokens(tokens);
  headers.set("Location", url.searchParams.get("returnUrl") || "/");
  throw new Response(null, { status: 303, statusText: "OK", headers }) as never;
}) satisfies LoaderFunction;

export const action = (async ({ request, context }) => {
  if (context.user?.id) throw redirect("/", 303);

  const returnUrl = new URL(request.url).searchParams.get("returnUrl");
  const rawProviderValue = (await request.formData()).get("provider");
  const provider = typeof rawProviderValue === "string" ? rawProviderValue : "";
  const redirectDetails = await SuperTokensHelpers.getThirdPartyRedirectDetails(provider, returnUrl);

  // Provider was not recognized. (Likely a bug in the code, unless the user is malicious.)
  if (redirectDetails === null) return json<Errors>({ banner: "Could not authorize with provider" }, 500);

  const { redirectUrl, pkceCodeVerifier } = redirectDetails;
  const headers = new Headers();

  // TODO: Should the PKCE Cookie Details be given a `path` that ONLY matches the ThirdParty Login Route?
  // Redirect user to Provider's Login Page
  headers.set("Location", redirectUrl);
  if (pkceCodeVerifier) headers.set("Set-Cookie", serialize(pkceCookieName, pkceCodeVerifier, createCookieSettings()));
  throw new Response(null, { status: 303, statusText: "OK", headers });
}) satisfies ActionFunction;
