import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { linkButtonClassName } from "@/lib/button-link";
import { formatDate } from "@/lib/format";

export type EventLandingVersion = {
  id: string;
  version: number;
  isActive: boolean;
  styleHint: string;
  createdAt: Date;
  updatedAt: Date;
};

type EventLandingVersionsProps = {
  eventId: string;
  eventSlug: string;
  landingPages: EventLandingVersion[];
  activateAction: (formData: FormData) => void | Promise<void>;
};

export function EventLandingVersions({
  eventId,
  eventSlug,
  landingPages,
  activateAction,
}: EventLandingVersionsProps) {
  return (
    <section className="border border-border bg-card">
      <div className="border-b border-border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Landing Pages
            </p>
            <h2 className="mt-2 text-xl font-semibold">落地页版本</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              保存后的生成结果会先进入版本库，激活后才会展示给前台用户。
            </p>
          </div>
          <Link
            href={`/events/${eventSlug}/landing`}
            target="_blank"
            rel="noreferrer"
            className={linkButtonClassName("outline", "sm")}
          >
            查看前台落地页
          </Link>
        </div>
      </div>

      {landingPages.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          暂无已保存落地页。生成并保存后，会在这里选择激活版本。
        </div>
      ) : (
        <div className="divide-y divide-border">
          {landingPages.map((landingPage) => (
            <div
              key={landingPage.id}
              className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-foreground">
                    Version {landingPage.version}
                  </h3>
                  {landingPage.isActive ? (
                    <Badge>当前激活</Badge>
                  ) : (
                    <Badge variant="outline">未激活</Badge>
                  )}
                  <span className="border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {landingPage.styleHint}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  生成时间：{formatDate(landingPage.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <Link
                  href={`/admin/events/${eventId}/landing-preview?landingPageId=${landingPage.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={linkButtonClassName("outline", "sm")}
                >
                  查看
                </Link>
                {landingPage.isActive ? null : (
                  <form action={activateAction}>
                    <input
                      type="hidden"
                      name="landingPageId"
                      value={landingPage.id}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      激活
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
