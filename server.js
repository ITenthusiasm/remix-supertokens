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
  process.env.NODE_ENV === "development"
    ? async (req, res, next) => {
        purgeRequireCache();

        const derivedSession = await deriveSession(req, res);
        // if (!session && !["/login", "/reset-password"].includes(req.path)) {
        //   return res.status(401).redirect("/login");
        // }

        const userId = derivedSession?.getUserId();

        return createRequestHandler({
          build: require(BUILD_DIR),
          mode: process.env.NODE_ENV,
          getLoadContext: () => ({ user: { id: userId } }),
        })(req, res, next);
      }
    : async (req, res, next) => {
        // PRODUCTION TEST IS NOT READY YET
        const session = await deriveSession(req, res);

        return createRequestHandler({
          build: require(BUILD_DIR),
          mode: process.env.NODE_ENV,
          getLoadContext: () => session,
        })(req, res, next);
      }
);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

/** @type {typeof Session.getSession} */
async function deriveSession(...getSessionArgs) {
  try {
    const session = await Session.getSession(...getSessionArgs);
    session.getUserId();
    return session;
  } catch (error) {
    // TODO: Do we need to consider updating our SSR logic to
    // let the user know the type of session error occurred?
    // Possibly not?
    return undefined;
  }
}

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
