import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { activateLandingPage } from "@/lib/ai/queries";

export async function POST(
  request: Request
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { landingPageId } = body;

    if (!landingPageId) {
      return NextResponse.json(
        { error: "请提供落地页 ID" },
        { status: 400 }
      );
    }

    await activateLandingPage(landingPageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("激活落地页失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "激活落地页失败" },
      { status: 500 }
    );
  }
}