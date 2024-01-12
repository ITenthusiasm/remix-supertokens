// Primary Imports
import { json } from "@remix-run/node";
import type { LoaderFunction, LinksFunction } from "@remix-run/node";
import { cssBundleHref } from "@remix-run/css-bundle";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useLoaderData,
  useMatches,
} from "@remix-run/react";

import Header, { headerStyles } from "~/components/Header";
import { authPages } from "~/utils/constants.js";

// Styles
import globalStyles from "~/styles/shared/global.css";

/* -------------------- Browser -------------------- */
export default function App() {
  const matches = useMatches();
  const { user } = useLoaderData<LoaderData>();
  const authenticated = !!user?.id;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Remix SuperTokens</title>
        <Meta />
        <Links />
      </head>

      <body>
        {!matches.some((m) => authPages.includes(m.pathname)) && (
          <Header authenticated={authenticated}>
            <Link to="">Home</Link>
            {authenticated && <Link to="private">Private</Link>}
          </Header>
        )}

        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: headerStyles },
  { rel: "stylesheet", href: globalStyles },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

/* -------------------- Server -------------------- */
interface LoaderData {
  user?: RemixContext["user"];
}

export const loader: LoaderFunction = ({ context }) => {
  return json<LoaderData>({ user: (context as RemixContext).user });
};
