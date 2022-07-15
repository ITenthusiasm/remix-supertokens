import type { LoaderFunction } from "@remix-run/node";
import { baseAuthUrl } from "~/utils/auth.server";

// See our NOTES on Session Refreshing via Browser Navigation for more info.
export const loader: LoaderFunction = async ({ request }) => {
  const authResponse = await fetch(
    new Request(`${baseAuthUrl}/session/refresh`, {
      method: "POST",
      headers: new Headers(request.headers),
    })
  );

  // Refresh failed
  if (authResponse.status !== 200) {
    console.log("Refresh Status: ", authResponse.status);
    authResponse.json().then((body) => console.log("Refresh Error: ", body, "\n"));

    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  // Refresh succeeded
  const headers = new Headers(authResponse.headers);
  headers.set("Location", new URL(request.url).searchParams.get("returnUrl") || "/");
  return new Response(null, { status: 302, statusText: "OK", headers });
};
