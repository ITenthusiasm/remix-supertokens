import type { LoaderFunction } from "@remix-run/node";
import { SuperTokensHelpers } from "~/utils/supertokens/index.server";
import { commonRoutes } from "~/utils/constants";

// TODO: Do we need to handle error cases?
export const loader: LoaderFunction = async ({ request }) => {
  const responseHeaders = await SuperTokensHelpers.logout(request.headers, request.method.toLowerCase() as "get");

  responseHeaders.set("Location", commonRoutes.login);
  return new Response(null, { status: 302, statusText: "OK", headers: responseHeaders });
};
