"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { IntentLink } from "@/components/intent-link";
import { Button } from "@/components/ui/button";

export function MobileNav({
  items,
  userLabel,
  userRole,
}: {
  items: { href: string; label: string }[];
  userLabel?: string;
  userRole?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative md:hidden">
      <Button
        variant="ghost"
        size="sm"
        className="size-9 min-h-11 min-w-11 p-0"
        onClick={() => setOpen(!open)}
        aria-label={open ? "关闭菜单" : "打开菜单"}
        aria-expanded={open}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-50 mt-2 min-w-48 border border-border bg-background/98 px-6 py-4 shadow-lg backdrop-blur">
            <nav aria-label="移动端导航" className="flex flex-col gap-1">
              {items.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <IntentLink
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    prefetchOnIntent={!isActive}
                    className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </IntentLink>
                );
              })}
            </nav>

            {userLabel ? (
              <div className="mt-4 border-t border-border pt-4">
                <div className="border border-border bg-muted px-3 py-3">
                  <p className="text-sm font-medium">{userLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {userRole === "ADMIN" ? "管理员" : "普通用户"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
