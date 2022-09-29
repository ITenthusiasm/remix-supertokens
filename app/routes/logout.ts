import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { baseAuthUrl } from "~/utils/auth.server";

type LoaderData = undefined | { logout?: string | null };

// Instead of letting Remix error out, redirect users who attempt to access `/logout` directly
export const loader: LoaderFunction = async ({ request }) => {
  const authResponse = await fetch(
    new Request(`${baseAuthUrl}/signout`, {
      method: "POST",
      headers: new Headers(request.headers),
    })
  );

  // Logout failed
  if (authResponse.status !== 200) {
    console.log("Logout failed!");
    return json<LoaderData>({ logout: "Logout failed" });
  }

  // Logout succeeded
  const headers = new Headers(authResponse.headers);
  headers.set("Location", "/login");
  return new Response(null, { status: 302, statusText: "OK", headers });
};
