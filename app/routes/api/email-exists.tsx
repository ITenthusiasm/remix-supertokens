import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { SuperTokensHelpers } from "~/utils/supertokens/index.server";

export const loader: LoaderFunction = async ({ request }) => {
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const emailExists = await SuperTokensHelpers.emailExists(email);
  return json(emailExists);
};
