import type { LoaderFunction } from "@remix-run/node";
import { SuperTokensHelpers, setCookiesFromMap, setHeadersFromMap } from "~/utils/supertokens/index.server";
import { commonRoutes } from "~/utils/constants";

// See our NOTES on Session Refreshing via Browser Navigation for more info.
// TODO: Do we need to handle error cases?
export const loader: LoaderFunction = async ({ request }) => {
  try {
    const { cookies, responseHeaders } = await SuperTokensHelpers.refreshToken(request.headers);

    const headers = new Headers({ Location: new URL(request.url).searchParams.get("returnUrl") || "/" });
    cookies.forEach(setCookiesFromMap(headers));
    responseHeaders.forEach(setHeadersFromMap(headers));
    return new Response(null, { status: 302, statusText: "OK", headers });
  } catch (error) {
    // TODO: Are there better ways to handle error cases?
    return new Response(null, { status: 302, statusText: "OK", headers: { Location: commonRoutes.login } });
  }
};
