import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRegistrationStatus } from "@/app/(app)/admin/events/actions";
import { MetricCard } from "@/components/metric-card";
import { AdminRegistrationReviewTable } from "@/components/registrations/admin-registration-review-table";
import { EventPhaseBadge } from "@/components/events/event-phase-badge";
import { PageHeaderCard } from "@/components/page-header-card";
import { Button } from "@/components/ui/button";
import { linkButtonClassName } from "@/lib/button-link";
import {
  getRegistrationStatusLabel,
  registrationStatuses,
} from "@/lib/registration-status";
import {
  getAdminEventRegistrations,
  parseAdminRegistrationFilters,
} from "@/lib/registrations/queries";

export default async function AdminEventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; query?: string }>;
}) {
  const { id } = await params;
  const filters = parseAdminRegistrationFilters(await searchParams);
  const data = await getAdminEventRegistrations(id, filters);

  if (!data) {
    notFound();
  }

  async function submitAction(input: {
    registrationIds: string[];
    nextStatus: "ACCEPTED" | "REJECTED";
  }) {
    "use server";

    return updateRegistrationStatus({
      eventId: id,
      ...input,
    });
  }

  const exportHref = buildExportHref(id, filters);
  const totalCount = Object.values(data.statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <PageHeaderCard
        tag="赛事管理 / 报名审核"
        title={data.event.name}
        description="审核报名申请、筛选报名状态，并导出当前筛选结果为 CSV。只有待审核报名支持批量接受或拒绝。"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <EventPhaseBadge phase={data.event.phase} />
            <span className="border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              当前只显示此赛事的报名
            </span>
          </div>
        }
        actions={
          <>
            <Link href={exportHref} prefetch={false} className={linkButtonClassName("outline", "sm")}>
              导出 CSV
            </Link>
            <Link href={`/admin/events/${id}/edit`} prefetch={false} className={linkButtonClassName("outline", "sm")}>
              编辑赛事
            </Link>
            <Link href="/admin/events" prefetch={false} className={linkButtonClassName("outline", "sm")}>
              返回赛事列表
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="总报名数" value={String(totalCount)} standalone />
        {registrationStatuses.map((status) => (
          <MetricCard
            key={status}
            label={getRegistrationStatusLabel(status)}
            value={String(data.statusCounts[status])}
            standalone
          />
        ))}
      </section>

      <section className="border border-border bg-card p-5 lg:p-6">
        <form className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_auto_auto]">
          <div>
            <label htmlFor="registration-search" className="text-sm font-medium">搜索报名人 / 邮箱 / 队伍</label>
            <input
              id="registration-search"
              name="query"
              defaultValue={filters.query}
              placeholder="例如：张三、team、example@company.com"
              className="mt-2 flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div>
            <label htmlFor="registration-status-filter" className="text-sm font-medium">状态筛选</label>
            <select
              id="registration-status-filter"
              name="status"
              defaultValue={filters.status ?? ""}
              className="mt-2 flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">全部状态</option>
              {registrationStatuses.map((status) => (
                <option key={status} value={status}>
                  {getRegistrationStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" size="sm">
              应用筛选
            </Button>
          </div>
          <div className="flex items-end">
            <Link href={`/admin/events/${id}/registrations`} prefetch={false} className={linkButtonClassName("outline", "sm")}>
              重置
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden border border-border bg-card">
        <AdminRegistrationReviewTable registrations={data.registrations} action={submitAction} />
      </section>
    </div>
  );
}

function buildExportHref(
  eventId: string,
  filters: {
    status?: string;
    query: string;
  }
) {
  const searchParams = new URLSearchParams();

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  if (filters.query) {
    searchParams.set("query", filters.query);
  }

  const suffix = searchParams.toString();
  return `/admin/events/${eventId}/registrations/export${suffix ? `?${suffix}` : ""}`;
}
