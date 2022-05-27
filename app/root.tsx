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

import { authPages } from "~/utils/constants";
import { logout } from "~/utils/auth.client";

// Styles
import globalStyles from "~/styles/shared/global.css";
import headerStyles from "~/styles/header.css";

interface LoaderData {
  user?: { id: string };
}

export const loader: LoaderFunction = ({ context }) => {
  return json<LoaderData>({
    user: context.user,
  });
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
});

export default function App() {
  const { user } = useLoaderData<LoaderData>();
  const matches = useMatches();
  matches.forEach((m) => console.log(m));

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {!matches.some((m) => authPages.includes(m.pathname)) && (
          <header>
            <nav>
              <ul>
                <li>
                  <Link to="">Home</Link>
                </li>

                <li>
                  <Link className="auth-button" to="login" onClick={user && logout}>
                    {user.id ? "Logout" : "Login"}
                  </Link>
                </li>
              </ul>
            </nav>
          </header>
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
];
