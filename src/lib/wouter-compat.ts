/**
 * Compatibility shim that lets ported wouter code run on react-router-dom.
 * Original wouter API:
 *   - <Link href="/x">  -> we map href to react-router's `to`
 *   - const [location, setLocation] = useLocation()  -> tuple of (pathname, navigate)
 *   - useRoute("/employees/:id") -> [match, params]
 *   - <Switch><Route path="..." component={X}/></Switch>  -> use react-router Routes/Route directly (we
 *     don't re-export Switch/Route here; App.tsx is rewritten to use react-router-dom natively)
 *   - <Redirect to="/x" />
 */
import * as React from "react";
import {
  Link as RRLink,
  useLocation as useRRLocation,
  useNavigate,
  useParams,
  matchPath,
  Navigate,
} from "react-router-dom";

type AnyProps = Record<string, unknown>;

export const Link = React.forwardRef<HTMLAnchorElement, AnyProps>(function Link(
  props,
  ref,
) {
  const { href, to, children, ...rest } = props as {
    href?: string;
    to?: string;
    children?: React.ReactNode;
  } & AnyProps;
  const target = (to ?? href ?? "#") as string;
  return React.createElement(
    RRLink as unknown as React.ComponentType<AnyProps>,
    { ref, to: target, ...rest },
    children as React.ReactNode,
  );
});

export function useLocation(): [string, (to: string) => void] {
  const loc = useRRLocation();
  const navigate = useNavigate();
  return [loc.pathname, (to: string) => navigate(to)];
}

export function useRoute(
  pattern: string,
): [boolean, Record<string, string> | null] {
  const loc = useRRLocation();
  const match = matchPath({ path: pattern, end: true }, loc.pathname);
  if (!match) return [false, null];
  return [true, (match.params as Record<string, string>) ?? {}];
}

export { useParams };

export { Navigate as Redirect };

// Stub Switch/Route for any straggling references — they just render children.
export const Switch: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
  React.createElement(React.Fragment, null, children);

export const Route: React.FC<{
  path?: string;
  component?: React.ComponentType<unknown>;
  children?: React.ReactNode;
}> = ({ component: Component, children }) => {
  if (Component) return React.createElement(Component);
  return React.createElement(React.Fragment, null, children);
};
