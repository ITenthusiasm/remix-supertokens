// Express Modules
import express from "express";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";

// SuperTokens Modules
import SuperTokens from "supertokens-node";
import Session from "supertokens-node/recipe/session/index.js";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";

// Miscellaneous + Local Modules
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import { serialize, parse } from "cookie";
import "dotenv/config"; // Side effect
import { commonRoutes } from "./app/utils/constants.js";
import {
  authCookieNames,
  deleteCookieSettings,
  deleteRefreshSettings,
} from "./app/utils/supertokens/cookieHelpers.server.js";

const port = process.env.PORT || 3000;

const publicPages = ["/", commonRoutes.login, commonRoutes.resetPassword, commonRoutes.emailExists];
const app = express();

/* -------------------- Super Tokens -------------------- */
SuperTokens.init({
  framework: "express",
  supertokens: {
    connectionURI: /** @type {string} */ (process.env.SUPERTOKENS_CONNECTION_URI),
    apiKey: process.env.SUPERTOKENS_API_KEY,
  },
  appInfo: {
    appName: "Testing Remix with Custom Backend",
    websiteDomain: process.env.SUPERTOKENS_WEBSITE_DOMAIN,
    apiDomain: /** @type {string} */ (process.env.SUPERTOKENS_API_DOMAIN),
    apiBasePath: process.env.SUPERTOKENS_API_BASE_PATH,
  },
  recipeList: [
    EmailPassword.init(), // Initializes signin / signup features
    Session.init(), // Initializes session features
  ],
});

// Supertokens
app.use(
  cors({
    origin: process.env.SUPERTOKENS_WEBSITE_DOMAIN,
    allowedHeaders: ["content-type", ...SuperTokens.getAllCORSHeaders()],
    credentials: true,
  }),
);

/* -------------------- End > Super Tokens -------------------- */

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");
app.use(compression());
app.use(morgan("tiny"));
installGlobals();

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) => vite.createServer({ server: { middlewareMode: true } }));

// Handle asset requests
if (viteDevServer) app.use(viteDevServer.middlewares);
else {
  // Vite fingerprints its assets so we can cache forever.
  app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be more aggressive with this caching.
app.use(express.static("build/client", { maxAge: "1h" }));

app.all(
  "*",
  setupRemixContext,
  createRequestHandler({
    getLoadContext: (_, res) => /** @type {import("@remix-run/node").AppLoadContext} */ ({ ...res.locals }),
    // TODO: Maybe create an issue letting Remix know that their types are a little janky...
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
      : // @ts-expect-error -- Sometimes the build file won't exist during local development
        /** @type {any} */ (await import("./build/server/index.js")),
  }),
);

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

/* -------------------- Our Own Helpers/Functions -------------------- */
/**
 * Derives all the data that needs to be passed to `Remix`'s `getLoadContext` and attaches it to `res.locals`.
 * Also redirects unauthenticated and session-expired users to the proper auth route.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function setupRemixContext(req, res, next) {
  try {
    const cookies = parse(req.headers.cookie ?? "");
    const accessToken = cookies[authCookieNames.access] ?? "";
    const antiCsrfToken = cookies[authCookieNames.csrf];
    const session = await Session.getSessionWithoutRequestResponse(accessToken, antiCsrfToken);
    const userId = session.getUserId();

    res.locals.user = userId ? { id: userId } : undefined;
    return next();
  } catch (error) {
    if (!Session.Error.isErrorFromSuperTokens(error)) return res.status(500).send("An unexpected error occurred");

    // URL Details
    const url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
    const isDataRequest = url.searchParams.has("_data");
    if (isDataRequest) url.searchParams.delete("_data");

    const userNeedsSessionRefresh = error.type === Session.Error.TRY_REFRESH_TOKEN;
    const requestAllowed =
      publicPages.includes(url.pathname) || (userNeedsSessionRefresh && url.pathname === commonRoutes.refreshSession);

    if (requestAllowed) {
      res.locals.user = undefined;
      return next();
    }

    const basePath = userNeedsSessionRefresh ? commonRoutes.refreshSession : commonRoutes.login;
    const returnUrl = encodeURI(`${url.pathname}${url.search}`);
    const redirectUrl = `${basePath}?returnUrl=${returnUrl}`;

    // Delete the user's tokens if they don't need to attempt a token refresh.
    if (!userNeedsSessionRefresh) {
      res.setHeader("Set-Cookie", [
        serialize(authCookieNames.access, "", deleteCookieSettings),
        serialize(authCookieNames.refresh, "", deleteRefreshSettings),
        serialize(authCookieNames.csrf, "", deleteCookieSettings),
      ]);
    }

    // Redirect the user to the proper auth page.
    return isDataRequest
      ? // Special handling for redirects from `Remix` data requests
        res.status(204).setHeader("x-remix-redirect", redirectUrl).send()
      : res.redirect(userNeedsSessionRefresh ? 307 : 303, redirectUrl);
  }
}
