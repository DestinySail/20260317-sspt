import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { getPrismaClient } from "@/lib/prisma";
import {
  generateLandingPageStream,
  type EventData,
} from "@/lib/ai/code-generator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { styleHint } = body;

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

    const eventData: EventData = {
      name: event.name,
      description: event.description,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      registrationStart: event.registrationStart.toISOString(),
      registrationEnd: event.registrationEnd.toISOString(),
      submissionStart: event.submissionStart.toISOString(),
      submissionEnd: event.submissionEnd.toISOString(),
      reviewStart: event.reviewStart.toISOString(),
      reviewEnd: event.reviewEnd.toISOString(),
      tracks: event.tracks as Array<{ name: string; description: string }>,
      challenges: event.challenges as Array<{
        title: string;
        description: string;
      }>,
      prizes: event.prizes as Array<{
        title: string;
        amount: string;
        description: string;
      }>,
      scoringCriteria: event.scoringCriteria as Array<{
        name: string;
        maxScore: number;
        weight: number;
      }>,
    };

    const stream = generateLandingPageStream({
      eventData,
      styleHint,
      eventSlug: event.slug,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("生成赛事页失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成赛事页失败" },
      { status: 500 }
    );
  }
}
