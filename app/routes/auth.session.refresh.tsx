import type { LoaderFunction } from "@remix-run/node";
import { SuperTokensHelpers } from "~/utils/supertokens/index.server";
import { commonRoutes } from "~/utils/constants";

// See our NOTES on Session Refreshing via Browser Navigation for more info.
export const loader: LoaderFunction = async ({ request }) => {
  try {
    const responseHeaders = await SuperTokensHelpers.refreshToken(request.headers);

    responseHeaders.set("Location", new URL(request.url).searchParams.get("returnUrl") || "/");
    return new Response(null, { status: 302, statusText: "OK", headers: responseHeaders });
  } catch (error) {
    // TODO: Are there better ways to handle error cases?
    return new Response(null, { status: 302, statusText: "OK", headers: { Location: commonRoutes.login } });
  }
};
