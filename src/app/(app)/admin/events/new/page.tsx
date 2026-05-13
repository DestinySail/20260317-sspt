import Link from "next/link";
import { createEvent } from "@/app/(app)/admin/events/actions";
import { EventForm } from "@/components/events/event-form";
import { PageHeaderCard } from "@/components/page-header-card";
import { linkButtonClassName } from "@/lib/button-link";

export default function AdminNewEventPage() {
  return (
    <div className="space-y-6">
      <PageHeaderCard
        tag="赛事管理 / 新建"
        title="创建新赛事"
        description="先补齐赛事基础信息、时间窗口、赛道和评分维度，保存后会先进入草稿状态。"
        actions={
          <Link href="/admin/events" className={linkButtonClassName("outline", "sm")}>
            返回列表
          </Link>
        }
      />

      <EventForm action={createEvent} showGenerateLanding={true} />
    </div>
  );
}
