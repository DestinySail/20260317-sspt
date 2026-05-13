import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { getPrismaClient } from "@/lib/prisma";
import { upsertEventLandingPage } from "@/lib/ai/queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { html, styleHint } = body;

    if (!html) {
      return NextResponse.json(
        { error: "请提供 HTML 内容" },
        { status: 400 }
      );
    }

    if (!styleHint) {
      return NextResponse.json(
        { error: "请提供风格描述" },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json(
        { error: "赛事不存在" },
        { status: 404 }
      );
    }

    const landingPage = await upsertEventLandingPage(id, styleHint, html);

    return NextResponse.json({
      success: true,
      landingPage: {
        id: landingPage.id,
        styleHint: landingPage.styleHint,
        updatedAt: landingPage.updatedAt,
      },
    });
  } catch (error) {
    console.error("保存赛事页失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存赛事页失败" },
      { status: 500 }
    );
  }
}
