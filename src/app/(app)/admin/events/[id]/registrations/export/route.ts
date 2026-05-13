import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatDate } from "@/lib/format";
import { getRegistrationStatusLabel } from "@/lib/registration-status";
import {
  listAdminRegistrationsForExport,
  parseAdminRegistrationFilters,
} from "@/lib/registrations/queries";

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
  const data = await listAdminRegistrationsForExport(
    id,
    parseAdminRegistrationFilters({
      status: url.searchParams.get("status") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
    })
  );

  if (!data) {
    return NextResponse.json({ message: "赛事不存在。" }, { status: 404 });
  }

  const csv = buildCsv(data);
  const fileName = `${data.event.slug}-registrations.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

function buildCsv(data: NonNullable<Awaited<ReturnType<typeof listAdminRegistrationsForExport>>>) {
  const rows = [
    ["报名 ID", "状态", "报名人", "邮箱", "队伍名称", "报名时间", "补充信息"],
    ...data.registrations.map((registration) => [
      registration.id,
      getRegistrationStatusLabel(registration.status),
      registration.user.name ?? "",
      registration.user.email ?? "",
      registration.teamName ?? "",
      formatDate(registration.createdAt),
      registration.answers.map((answer) => `${answer.label}: ${answer.value || "未填写"}`).join(" | "),
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

