"use client";

import { LayoutDashboard, Trophy } from "lucide-react";
import { usePathname } from "next/navigation";
import { IntentLink } from "@/components/intent-link";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/admin",
    label: "概览",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/events",
    label: "赛事管理",
    icon: Trophy,
  },
];

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside aria-label="管理后台导航" className="w-full shrink-0 border border-border bg-muted p-4 lg:w-56">
      <div className="mb-3 border-b border-border pb-4">
        <h2 className="font-[family-name:var(--font-mono-ui-face)] text-xs font-medium tracking-tight">管理后台</h2>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          赛事管理与运营控制台
        </p>
      </div>

      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isAdminNavItemActive(pathname, item.href);

          return (
            <IntentLink
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              prefetchOnIntent={!isActive}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-r-2 border-primary text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </IntentLink>
          );
        })}
      </nav>
    </aside>
  );
}
