import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  to: string;
  className?: string | undefined;
  activeProps?: Record<string, unknown> | undefined;
  activeOptions?: Record<string, unknown> | undefined;
  children?: ReactNode | undefined;
  title?: string | undefined;
  onClick?: (() => void) | undefined;
};

/**
 * Thin wrapper so navigation config can use plain string paths.
 * Unbuilt sections resolve to the placeholder splat route.
 */
export function NavLink(props: Props) {
  const AnyLink = Link as unknown as (p: ComponentProps<"a"> & Props) => ReactNode;
  return <AnyLink {...props} />;
}
