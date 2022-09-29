// Primary Imports
import { Link } from "@remix-run/react";
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
  const authAction = authenticated ? "logout" : "login";

  return (
    <header>
      <nav aria-label="Primary Navigation">
        <ul>
          {React.Children.map(children, (RemixLink) => {
            if (RemixLink && RemixLink.type === Link) return <li>{RemixLink}</li>;
          })}

          <li>
            <Link className="auth-button" to={`/${authAction}`}>
              {authAction}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
