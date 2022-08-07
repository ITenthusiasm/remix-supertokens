// Primary Imports
import { Link, Form } from "@remix-run/react";
import React from "react";
import type { ReactElement, ComponentProps } from "react";

// Styles
export { default as headerStyles } from "~/styles/components/Header.css";

interface HeaderProps {
  authenticated?: boolean;
  children:
    | (ReactElement<ComponentProps<typeof Link>> | false)
    | (ReactElement<ComponentProps<typeof Link>> | false)[];
}

function Header({ authenticated = false, children }: HeaderProps): ReactElement {
  return (
    <header>
      <nav aria-label="Primary Navigation">
        <ul>
          {React.Children.map(children, (RemixLink) => {
            if (RemixLink && RemixLink.type === Link) return <li>{RemixLink}</li>;
          })}

          <li>
            {authenticated ? (
              <Form method="post" action="/logout">
                <button className="auth-button" type="submit">
                  Logout
                </button>
              </Form>
            ) : (
              <Link className="auth-button" to="/login">
                Login
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
