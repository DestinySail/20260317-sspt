"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { useState } from "react";

type IntentLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & {
    prefetchOnIntent?: boolean;
    preventSameRouteNavigation?: boolean;
  };

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function isCurrentUrl(href: LinkProps["href"]) {
  if (typeof window === "undefined" || typeof href !== "string") {
    return false;
  }

  const target = new URL(href, window.location.href);
  return (
    target.origin === window.location.origin &&
    target.pathname === window.location.pathname &&
    target.search === window.location.search &&
    target.hash === window.location.hash
  );
}

export function IntentLink({
  prefetch,
  prefetchOnIntent = true,
  preventSameRouteNavigation = true,
  onClick,
  onFocus,
  onMouseEnter,
  href,
  children,
  ...props
}: IntentLinkProps) {
  const [shouldPrefetch, setShouldPrefetch] = useState(false);
  const resolvedPrefetch =
    prefetch ?? (prefetchOnIntent ? (shouldPrefetch ? null : false) : false);

  return (
    <Link
      {...props}
      href={href}
      prefetch={resolvedPrefetch}
      onClick={(event) => {
        if (
          preventSameRouteNavigation &&
          isPlainLeftClick(event) &&
          props.target !== "_blank" &&
          isCurrentUrl(href)
        ) {
          event.preventDefault();
        }

        onClick?.(event);
      }}
      onFocus={(event) => {
        setShouldPrefetch(true);
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        setShouldPrefetch(true);
        onMouseEnter?.(event);
      }}
    >
      {children}
    </Link>
  );
}
