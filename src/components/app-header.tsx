import Link from "next/link";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { SignInTrigger } from "@/components/sign-in-trigger";
import { getConfiguredAuthProviders } from "@/lib/auth-providers";
import { getOptionalSession } from "@/lib/auth-session";
import { hasJudgeAssignments } from "@/lib/reviews/queries";

function getUserLabel(name?: string | null, email?: string | null) {
  if (name) {
    return name;
  }

  if (email) {
    return email;
  }

  return "已登录用户";
}

export async function AppHeader() {
  const session = await getOptionalSession();
  const showJudgeCenter = session?.user ? await hasJudgeAssignments(session.user.id) : false;
  const providers = getConfiguredAuthProviders();
  const authReady = Boolean(process.env.AUTH_SECRET?.trim()) && providers.length > 0;
  const initials = (session?.user?.name ?? session?.user?.email ?? "U")
    .trim()
    .charAt(0)
    .toUpperCase();
  const linkButtonClassName =
    "inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-colors hover:bg-primary/90";

  const navItems: { href: string; label: string }[] = [
    { href: "/", label: "首页" },
  ];
  if (session?.user) {
    navItems.push({ href: "/my/registrations", label: "我的报名" });
    navItems.push({ href: "/my/projects", label: "我的作品" });
    if (showJudgeCenter) {
      navItems.push({ href: "/judge", label: "评审中心" });
    }
  }
  if (session?.user?.role === "ADMIN") {
    navItems.push({ href: "/admin", label: "管理后台" });
  }

  return (
    <header role="banner" aria-label="网站头部" className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-[12px]">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="leading-none">
            <span className="font-[family-name:var(--font-mono-ui-face)] text-[13px] font-medium tracking-[-0.01em] text-foreground">
              AI 赛事业务管理平台
            </span>
          </Link>

          <nav aria-label="主导航" className="hidden items-center gap-4 font-[family-name:var(--font-mono-ui-face)] text-[13px] text-muted-foreground md:flex">
            <Link href="/" className="transition-colors hover:text-foreground">
              首页
            </Link>
            {session?.user ? (
              <>
                <Link href="/my/registrations" className="transition-colors hover:text-foreground">
                  我的报名
                </Link>
                <Link href="/my/projects" className="transition-colors hover:text-foreground">
                  我的作品
                </Link>
                {showJudgeCenter ? (
                  <Link href="/judge" className="transition-colors hover:text-foreground">
                    评审中心
                  </Link>
                ) : null}
              </>
            ) : null}
            {session?.user?.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="transition-colors hover:text-foreground"
              >
                管理后台
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <MobileNav
            items={navItems}
            userLabel={session?.user ? getUserLabel(session.user.name, session.user.email) : undefined}
            userRole={session?.user?.role ?? undefined}
          />
          {session?.user ? (
            <>
              <div className="hidden items-center gap-2.5 rounded-full border border-border/60 bg-card py-1 pl-1 pr-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:flex">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </div>
                <div className="text-sm leading-tight">
                  <span className="font-medium text-foreground">
                    {getUserLabel(session.user.name, session.user.email)}
                  </span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {session.user.role === "ADMIN" ? "管理员" : "普通用户"}
                  </span>
                </div>
              </div>

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
                  退出登录
                </Button>
              </form>
            </>
          ) : authReady ? (
            <SignInTrigger providers={providers} callbackUrl="/" className={linkButtonClassName} />
          ) : (
            <span className="hidden border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
              待配置 OAuth
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
