import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatDate } from "@/lib/format";
import {
  listAdminProjectsForExport,
  parseAdminProjectFilters,
} from "@/lib/projects/queries";
import { getProjectStatusLabel } from "@/lib/projects/status";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(
      new URL(`/api/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`, request.url)
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const data = await listAdminProjectsForExport(
    id,
    parseAdminProjectFilters({
      status: url.searchParams.get("status") ?? undefined,
      track: url.searchParams.get("track") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
    })
  );

  if (!data) {
    return NextResponse.json({ message: "赛事不存在。" }, { status: 404 });
  }

  const csv = buildCsv(data);
  const fileName = `${data.event.slug}-projects.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

function buildCsv(data: NonNullable<Awaited<ReturnType<typeof listAdminProjectsForExport>>>) {
  const rows = [
    ["作品 ID", "状态", "作品名称", "提交者", "邮箱", "队伍", "赛道", "赛题", "源码链接", "演示链接", "视频链接", "创建时间", "更新时间"],
    ...data.projects.map((project) => [
      project.id,
      getProjectStatusLabel(project.status),
      project.name,
      project.user.name ?? "",
      project.user.email ?? "",
      project.teamName ?? "",
      project.track ?? "",
      project.challenges.join(" | "),
      project.sourceUrl ?? "",
      project.demoUrl ?? "",
      project.videoUrl ?? "",
      formatDate(project.createdAt),
      formatDate(project.updatedAt),
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
