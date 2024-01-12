// Node.js Modules
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

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
import { broadcastDevReady, installGlobals } from "@remix-run/node";
import { serialize, parse } from "cookie";
import sourceMapSupport from "source-map-support";
import "dotenv/config"; // Side effect
import { commonRoutes } from "./app/utils/constants.js";
import {
  authCookieNames,
  deleteCookieSettings,
  deleteRefreshSettings,
} from "./app/utils/supertokens/cookieHelpers.server.js";

const port = process.env.PORT || 3000;
const BUILD_PATH = path.resolve("build/index.js");
const VERSION_PATH = path.resolve("build/version.txt");

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

installGlobals();
sourceMapSupport.install({
  retrieveSourceMap(source) {
    if (!source.startsWith("file://")) return null;

    const filePath = url.fileURLToPath(source);
    const sourceMapPath = `${filePath}.map`;

    if (!fs.existsSync(sourceMapPath)) return null;
    return { url: source, map: fs.readFileSync(sourceMapPath, "utf8") };
  },
});

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use("/build", express.static("public/build", { immutable: true, maxAge: "1y" }));

// Everything else (like favicon.ico) is cached for an hour. You may want to be more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));
app.use(morgan("tiny"));

const initialBuild = await reimportServer();
app.all(
  "*",
  setupRemixContext,
  process.env.NODE_ENV === "development"
    ? await createDevRequestHandler(initialBuild)
    : createRequestHandler({
        build: initialBuild,
        mode: initialBuild.mode,
        getLoadContext: (_, res) => ({ ...res.locals }),
      }),
);

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
  if (process.env.NODE_ENV === "development") broadcastDevReady(initialBuild);
});

/** @returns {Promise<import("@remix-run/node").ServerBuild>} */
async function reimportServer() {
  const stat = fs.statSync(BUILD_PATH);
  const buildUrl = url.pathToFileURL(BUILD_PATH).href; // Used for Windows compatibility with dynamic `import`

  // Use a timestamp query parameter to bust the `import` cache.
  return import(`${buildUrl}?t=${stat.mtimeMs}`);
}

/**
 * @param {import("@remix-run/node").ServerBuild} firstBuild The {@link initialBuild} generated in this file.
 * @returns {Promise<import('@remix-run/express').RequestHandler>}
 */
async function createDevRequestHandler(firstBuild) {
  let build = firstBuild;
  const chokidar = await import("chokidar");
  chokidar.watch(VERSION_PATH, { ignoreInitial: true }).on("add", handleServerUpdate).on("change", handleServerUpdate);

  // Wrap request handler to make sure it's recreated with the latest build for every request
  return async (req, res, next) => {
    try {
      const getLoadContext = () => ({ ...res.locals });
      return createRequestHandler({ build, mode: "development", getLoadContext })(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  async function handleServerUpdate() {
    // 1. Re-import the server build
    build = await reimportServer();

    // 2. Tell Remix that this app server is now up-to-date and ready
    broadcastDevReady(build);
  }
}

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

    res.locals = { user: { id: userId } };
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
      res.locals = { user: {} };
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
