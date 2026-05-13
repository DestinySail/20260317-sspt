import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { requireAdmin } from "@/lib/auth-guards";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin("/admin");

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-6 py-8 lg:flex-row lg:px-8">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
