// Primary Imports
import { json } from "@remix-run/node";
import type { LoaderFunction, MetaFunction, LinksFunction } from "@remix-run/node";
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
import { authPages } from "~/utils/constants";

// Styles
import globalStyles from "~/styles/shared/global.css";

/* -------------------- Browser -------------------- */
export default function App() {
  const matches = useMatches();
  const { user } = useLoaderData<LoaderData>();
  const authenticated = !!user.id;

  return (
    <html lang="en">
      <head>
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

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
});

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: headerStyles },
  { rel: "stylesheet", href: globalStyles },
];

/* -------------------- Server -------------------- */
interface LoaderData {
  user: { id?: string };
}

export const loader: LoaderFunction = ({ context }) => {
  return json<LoaderData>({ user: context.user });
};
