import { json, redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { baseAuthUrl } from "~/utils/auth.server";

// Instead of letting Remix error out, redirect users who attempt to access `/logout` directly
export const loader = () => redirect("/");

type ActionData = undefined | { logout?: string | null };

export const action: ActionFunction = async ({ request }) => {
  const authResponse = await fetch(
    new Request(`${baseAuthUrl}/signout`, {
      method: "POST",
      headers: new Headers(request.headers),
    })
  );

  // Logout failed
  if (authResponse.status !== 200) {
    console.log("Logout failed!");
    return json<ActionData>({ logout: "Logout failed" });
  }

  // Logout succeeded
  const headers = new Headers(authResponse.headers);
  headers.set("Location", "/login");

  return new Response(authResponse.body, {
    status: 302,
    statusText: "OK",
    headers,
  });
};
