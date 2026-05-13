"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteEvent } from "@/app/(app)/admin/events/actions";
import { Button } from "@/components/ui/button";

type EventDeleteButtonProps = {
  eventId: string;
  redirectTo?: string;
};

export function EventDeleteButton({ eventId, redirectTo }: EventDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      "仅未发布且无关联数据的赛事可删除，删除后不可恢复。确认继续吗？"
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteEvent({ eventId });

      if (!result.success) {
        window.alert(result.error.message);
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      }

      router.refresh();
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
      {isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
      {isPending ? "删除中..." : "删除草稿"}
    </Button>
  );
}
