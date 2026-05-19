"use client";

import { usePathname } from "next/navigation";
import { IntentLink } from "@/components/intent-link";
import { cn } from "@/lib/utils";

export type HeaderNavItem = {
  href: string;
  label: string;
};

export function isHeaderNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({ items }: { items: HeaderNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="主导航" className="hidden items-center gap-1 text-sm font-medium text-muted-foreground md:flex">
      {items.map((item) => {
        const isActive = isHeaderNavItemActive(pathname, item.href);

        return (
          <IntentLink
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            prefetchOnIntent={!isActive}
            className={cn(
              "relative min-h-11 rounded-md px-3 py-2 transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "hover:bg-secondary hover:text-foreground",
              "after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary after:transition-opacity",
              isActive ? "after:opacity-100" : "after:opacity-0"
            )}
          >
            {item.label}
          </IntentLink>
        );
      })}
    </nav>
  );
}
