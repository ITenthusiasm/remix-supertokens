import type { LoaderFunction } from "@remix-run/node";
import { parse } from "cookie";
import SuperTokensHelpers from "~/utils/supertokens/index.server";
import { authCookieNames, createHeadersFromTokens } from "~/utils/supertokens/cookieHelpers.server";
import { commonRoutes } from "~/utils/constants";

export const loader: LoaderFunction = async ({ request }) => {
  const cookies = parse(request.headers.get("Cookie") ?? "");
  const accessToken = cookies[authCookieNames.access];
  const antiCsrfToken = cookies[authCookieNames.csrf];
  await SuperTokensHelpers.logout({ accessToken, antiCsrfToken });

  const headers = createHeadersFromTokens({});
  headers.set("Location", commonRoutes.login);
  return new Response(null, { status: 303, statusText: "OK", headers });
};
