const path = require("path");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");
const SuperTokens = require("supertokens-node");
const Session = require("supertokens-node/recipe/session");
const EmailPassword = require("supertokens-node/recipe/emailpassword");
const { serialize, parse } = require("cookie");
require("dotenv/config"); // Side effect
const { commonRoutes } = require("./app/utils/constants");
const {
  authCookieNames,
  deleteCookieSettings,
  deleteRefreshSettings,
} = require("./app/utils/supertokens/cookieHelpers.server");

const BUILD_DIR = path.join(process.cwd(), "build");
const publicPages = ["/", commonRoutes.login, commonRoutes.resetPassword, commonRoutes.emailExists];
const app = express();

/* -------------------- Super Tokens -------------------- */
SuperTokens.init({
  framework: "express",
  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI,
    apiKey: process.env.SUPERTOKENS_API_KEY,
  },
  appInfo: {
    appName: "Testing Remix with Custom Backend",
    websiteDomain: process.env.SUPERTOKENS_WEBSITE_DOMAIN,
    apiDomain: process.env.SUPERTOKENS_API_DOMAIN,
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
  })
);

/* -------------------- End > Super Tokens -------------------- */

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use("/build", express.static("public/build", { immutable: true, maxAge: "1y" }));

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

app.all(
  "*",
  setupRemixContext,
  process.env.NODE_ENV === "development"
    ? (req, res, next) => {
        purgeRequireCache();

        return createRequestHandler({
          build: require(BUILD_DIR),
          mode: process.env.NODE_ENV,
          getLoadContext: () => ({ ...res.locals }),
        })(req, res, next);
      }
    : (req, res, next) =>
        createRequestHandler({
          build: require(BUILD_DIR),
          mode: process.env.NODE_ENV,
          getLoadContext: () => ({ ...res.locals }),
        })(req, res, next)
);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, but then you'll have to reconnect to databases/etc on each
  // change. We prefer the DX of this, so we've included it for you by default
  for (let key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}

/* -------------------- Our Own Helpers/Functions -------------------- */
/**
 * @type {express.RequestHandler} Derives all the data that needs to be passed to
 * `Remix`'s `getLoadContext` and attaches it to `res.locals`. Also redirects
 * unauthenticated and session-expired users to the proper auth route.
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
    const redirectUrl =
      url.pathname === commonRoutes.refreshSession || url.pathname === "/logout"
        ? basePath
        : `${basePath}?returnUrl=${returnUrl}`;

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
