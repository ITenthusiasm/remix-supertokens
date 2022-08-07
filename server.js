const path = require("path");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");
const SuperTokens = require("supertokens-node");
const Session = require("supertokens-node/recipe/session");
const { middleware, errorHandler } = require("supertokens-node/framework/express");
const EmailPassword = require("supertokens-node/recipe/emailpassword");
require("dotenv/config"); // Side effect

const BUILD_DIR = path.join(process.cwd(), "build");

/** @type {["/", "/login", "/reset-password", "/auth/session/refresh"]} */
const publicPages = ["/", "/login", "/reset-password", "/auth/session/refresh"];

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
    // Initializes signin / signup features
    EmailPassword.init({
      resetPasswordUsingTokenFeature: {
        getResetPasswordURL: () => `${process.env.DOMAIN}/reset-password`,
      },
    }),
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

app.use(middleware());
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

// SuperTokens error handling
app.use(errorHandler());

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
  const { session, error } = await deriveSession(req, res);

  if (error && !publicPages.includes(req.path)) {
    // Craft return URL based on where the user was originally trying to go
    const url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
    const isDataRequest = url.searchParams.has("_data");
    if (isDataRequest) url.searchParams.delete("_data");

    const basePath = error === "UNAUTHORIZED" ? "/login" : "/auth/session/refresh";
    const returnUrl = encodeURI(`${url.pathname}${url.search}`);
    const redirectUrl = `${basePath}?returnUrl=${returnUrl}`;

    return isDataRequest
      ? // special handling for redirect from `Remix` data requests
        res.status(204).set("x-remix-redirect", redirectUrl).send()
      : res.redirect(redirectUrl);
  }

  const userId = session?.getUserId();
  res.locals = { user: { id: userId } };
  next();
}

/**
 * Provides the SuperTokens `session` if it exists. Otherwise, provides the SuperTokens `error`
 * explaining why the a session could not be found.
 * @param {Parameters<typeof Session.getSession>[0]} req
 * @param {Parameters<typeof Session.getSession>[1]} res
 */
async function deriveSession(req, res) {
  try {
    /** @type {NonNullable<Awaited<ReturnType<typeof Session.getSession>>>} */
    const session = await Session.getSession(req, res);
    return { session };
  } catch (error) {
    /** @type {import("./app/utils/auth.server").SuperTokensSessionError} */
    const { type } = error;
    return { error: type };
  }
}
