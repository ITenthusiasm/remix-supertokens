// Primary Imports
import { Link } from "@remix-run/react";
import { Children } from "react";
import type { ReactElement, ComponentProps } from "react";

// Styles
export { default as headerStyles } from "~/styles/components/Header.css?url";

interface HeaderProps {
  authenticated?: boolean;
  children: (ReactElement<ComponentProps<typeof Link>> | false) | (ReactElement<ComponentProps<typeof Link>> | false)[];
}

function Header({ authenticated = false, children }: HeaderProps): ReactElement {
  const authAction = authenticated ? "logout" : "login";

  return (
    <header>
      <nav aria-label="Primary Navigation">
        <ul>
          {Children.map(children, (c) => (c && c.type === Link ? <li>{c}</li> : null))}
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
