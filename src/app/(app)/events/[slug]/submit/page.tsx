import Link from "next/link";
import { notFound } from "next/navigation";
import { submitProject, createProject, updateProject } from "@/app/(app)/my/projects/actions";
import { InfoItem } from "@/components/info-item";
import { PageHeaderCard } from "@/components/page-header-card";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { linkButtonClassName } from "@/lib/button-link";
import { requireUser } from "@/lib/auth-guards";
import { canSubmitProjectForEvent } from "@/lib/events/phase";
import { formatDate, formatDateRange } from "@/lib/format";
import { getProjectSubmissionPageData } from "@/lib/projects/queries";

export default async function EventProjectSubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireUser(`/events/${slug}/submit`);
  const data = await getProjectSubmissionPageData(slug, session.user.id);

  if (!data) {
    notFound();
  }

  const submissionOpen = canSubmitProjectForEvent(data.event);
  const isConfirmed = data.registration?.status === "CONFIRMED";
  const initialValues = {
    eventId: data.event.id,
    name: data.project?.name ?? "",
    description: data.project?.description ?? "",
    sourceUrl: data.project?.sourceUrl ?? "",
    demoUrl: data.project?.demoUrl ?? "",
    videoUrl: data.project?.videoUrl ?? "",
    track: data.project?.track ?? "",
    challenges: data.project?.challenges ?? [],
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-6 py-10 lg:px-8">
      <PageHeaderCard
        tag="作品提交"
        title={data.event.name}
        description="已确认参赛的选手可在提交窗口内保存草稿、提交终稿，并在截止前继续修改最近一次提交内容。"
        extra={
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="border border-border bg-muted px-3 py-1.5">
              提交窗口：{formatDateRange(data.event.submissionStart, data.event.submissionEnd)}
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              赛道：{data.event.tracks.length > 0 ? `${data.event.tracks.length} 个` : "未配置"}
            </span>
            <span className="border border-border bg-muted px-3 py-1.5">
              赛题：{data.event.challenges.length > 0 ? `${data.event.challenges.length} 个` : "未配置"}
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href={`/events/${slug}`} className={linkButtonClassName("outline", "sm")}>
              返回详情
            </Link>
            <Link href="/my/projects" className={linkButtonClassName("outline", "sm")}>
              我的作品
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <InfoItem label="提交开始" value={formatDate(data.event.submissionStart)} />
        <InfoItem label="提交截止" value={formatDate(data.event.submissionEnd)} />
        <InfoItem label="评审开始" value={formatDate(data.event.reviewStart)} />
      </section>

      {data.project ? (
        <section className="border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{data.project.name}</h2>
              <p className="text-sm leading-7 text-muted-foreground">
                {data.project.status === "FINAL"
                  ? "你已提交终稿，截止前仍可继续修改并重新提交。"
                  : "当前为草稿状态，建议在截止前补全信息并提交终稿。"}
              </p>
              <p className="text-xs text-muted-foreground">
                最近更新：{formatDate(data.project.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ProjectStatusBadge status={data.project.status} />
              <Link href="/my/projects" className={linkButtonClassName("outline", "sm")}>
                前往我的作品
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {!isConfirmed ? (
        <section className="border border-border bg-card p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">需要先获得报名确认才能提交作品</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              {getRegistrationBlockHint(data.registration?.status)}
            </p>
            <Link href="/my/registrations" className={linkButtonClassName("default", "sm")}>
              查看我的报名
            </Link>
          </div>
        </section>
      ) : !submissionOpen ? (
        <section className="border border-border bg-card p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">当前不在作品提交时间窗口内</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              {getSubmissionWindowHint(data.event.submissionStart, data.event.submissionEnd)}
            </p>
            <Link href={`/events/${slug}`} className={linkButtonClassName("default", "sm")}>
              返回赛事详情
            </Link>
          </div>
        </section>
      ) : (
        <ProjectForm
          key={`${data.project?.id ?? "new"}-${data.project?.updatedAt?.toISOString() ?? "empty"}-${data.project?.status ?? "new"}`}
          event={data.event}
          initialValues={initialValues}
          currentStatus={data.project?.status}
          createAction={createProject}
          updateAction={updateProject}
          submitAction={submitProject}
        />
      )}
    </div>
  );
}

function getRegistrationBlockHint(
  status?: "PENDING" | "ACCEPTED" | "CONFIRMED" | "REJECTED" | "CANCELLED"
) {
  switch (status) {
    case "PENDING":
      return "你的报名仍在等待管理员审核，通过后还需要在“我的报名”里确认参赛。";
    case "ACCEPTED":
      return "管理员已录取你的报名，请先前往“我的报名”点击“确认参赛”。";
    case "REJECTED":
      return "当前报名未通过审核，因此无法进入作品提交。";
    case "CANCELLED":
      return "你已取消报名，如需再次参赛请联系管理员。";
    default:
      return "当前账号尚未拥有可提交作品的确认报名记录。";
  }
}

function getSubmissionWindowHint(submissionStart: Date, submissionEnd: Date) {
  const now = new Date();

  if (now < submissionStart) {
    return `提交窗口将于 ${formatDate(submissionStart)} 开启，请在开放后再进入此页填写作品。`;
  }

  if (now >= submissionEnd) {
    return `提交窗口已于 ${formatDate(submissionEnd)} 关闭，当前只能查看已提交内容。`;
  }

  return "当前暂不能提交作品。";
}
