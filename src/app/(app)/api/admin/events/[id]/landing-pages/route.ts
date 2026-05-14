import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { getEventLandingPages } from "@/lib/ai/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const pages = await getEventLandingPages(id);

    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id,
        version: p.version,
        isActive: p.isActive,
        styleHint: p.styleHint,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error("获取落地页列表失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取落地页列表失败" },
      { status: 500 }
    );
  }
}