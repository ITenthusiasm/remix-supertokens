import type { LoaderFunction } from "@remix-run/node";
import { SuperTokensHelpers, setCookiesFromMap, setHeadersFromMap } from "~/utils/supertokens/index.server";
import { commonRoutes } from "~/utils/constants";

// TODO: Do we need to handle error cases?
export const loader: LoaderFunction = async ({ request }) => {
  const { cookies, responseHeaders } = await SuperTokensHelpers.logout(
    request.headers,
    request.method.toLowerCase() as "get"
  );

  const headers = new Headers({ Location: commonRoutes.login });
  cookies.forEach(setCookiesFromMap(headers));
  responseHeaders.forEach(setHeadersFromMap(headers));
  return new Response(null, { status: 302, statusText: "OK", headers });
};
