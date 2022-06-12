import { json, redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

// Instead of letting Remix error out, redirect users who attempt to access `/logout` directly
export const loader = () => redirect("/");

interface ActionData {
  errors?: {
    logout?: string | null;
  };
}

export const action: ActionFunction = async ({ request }) => {
  const domain = `http://localhost:3000`;
  const mappedHeaders = new Headers(request.headers);
  const mappedRequest = new Request(`${domain}/auth/signout`, {
    method: "POST",
    headers: mappedHeaders,
  });

  const authResponse = await fetch(mappedRequest);

  if (authResponse.status !== 200) {
    console.log("Logout failed!");
    return json<ActionData>({ errors: { logout: "Logout Failed" } });
  }

  // Logout was successful
  const remixHeaders = new Headers(authResponse.headers);
  remixHeaders.set("Location", "/login");

  const remixResponse = new Response(authResponse.body, {
    status: 302,
    statusText: "OK",
    headers: remixHeaders,
  });

  return remixResponse;
};
