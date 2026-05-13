import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { upsertProjectScore } from "@/app/(app)/judge/actions";

const { authMock, getPrismaClientMock, revalidatePathMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getPrismaClientMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: getPrismaClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const validInput = {
  eventId: "11111111-1111-4111-8111-111111111111",
  projectId: "22222222-2222-4222-8222-222222222222",
  scores: [
    { criterionName: "创新性", score: 9 },
    { criterionName: "完成度", score: 8.5 },
  ],
  comment: "评审意见：整体完成度较高。",
};

function createPrismaMock(overrides?: {
  eventFindUnique?: ReturnType<typeof vi.fn>;
  eventJudgeFindUnique?: ReturnType<typeof vi.fn>;
  projectFindFirst?: ReturnType<typeof vi.fn>;
  projectScoreUpsert?: ReturnType<typeof vi.fn>;
}) {
  return {
    event: {
      findUnique:
        overrides?.eventFindUnique ??
        vi.fn().mockResolvedValue({
          id: validInput.eventId,
          slug: "e2e-review-event",
          published: true,
          reviewStart: new Date("2026-04-10T09:00:00.000Z"),
          reviewEnd: new Date("2026-04-15T09:00:00.000Z"),
          scoringCriteria: [
            { name: "创新性", maxScore: 10, weight: 40 },
            { name: "完成度", maxScore: 10, weight: 35 },
          ],
        }),
    },
    eventJudge: {
      findUnique:
        overrides?.eventJudgeFindUnique ??
        vi.fn().mockResolvedValue({
          eventId: validInput.eventId,
        }),
    },
    project: {
      findFirst:
        overrides?.projectFindFirst ??
        vi.fn().mockResolvedValue({
          id: validInput.projectId,
          eventId: validInput.eventId,
        }),
    },
    projectScore: {
      upsert:
        overrides?.projectScoreUpsert ??
        vi.fn().mockResolvedValue({
          id: "score-1",
        }),
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-12T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("judge actions", () => {
  it("rejects unauthenticated score submissions", async () => {
    authMock.mockResolvedValue(null);

    await expect(upsertProjectScore(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "请先登录后再继续评分。",
      },
    });
  });

  it("rejects users who are not assigned as judges for the event", async () => {
    authMock.mockResolvedValue({ user: { id: "judge-1", role: "USER" } });
    getPrismaClientMock.mockReturnValue(
      createPrismaMock({
        eventJudgeFindUnique: vi.fn().mockResolvedValue(null),
      })
    );

    await expect(upsertProjectScore(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "你未被分配为该赛事评委。",
      },
    });
  });

  it("rejects score submissions for projects that are not final", async () => {
    authMock.mockResolvedValue({ user: { id: "judge-1", role: "USER" } });
    getPrismaClientMock.mockReturnValue(
      createPrismaMock({
        projectFindFirst: vi.fn().mockResolvedValue(null),
      })
    );

    await expect(upsertProjectScore(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "作品不存在，或当前尚未提交终稿。",
      },
    });
  });

  it("rejects score submissions outside the review window", async () => {
    authMock.mockResolvedValue({ user: { id: "judge-1", role: "USER" } });
    getPrismaClientMock.mockReturnValue(
      createPrismaMock({
        eventFindUnique: vi.fn().mockResolvedValue({
          id: validInput.eventId,
          slug: "e2e-review-event",
          published: true,
          reviewStart: new Date("2026-04-13T09:00:00.000Z"),
          reviewEnd: new Date("2026-04-18T09:00:00.000Z"),
          scoringCriteria: [
            { name: "创新性", maxScore: 10, weight: 40 },
            { name: "完成度", maxScore: 10, weight: 35 },
          ],
        }),
      })
    );

    await expect(upsertProjectScore(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "CONFLICT",
        message: "当前不在评审时间窗口内，暂不可提交评分。",
      },
    });
  });

  it("rejects stale scoring criteria payloads", async () => {
    authMock.mockResolvedValue({ user: { id: "judge-1", role: "USER" } });
    getPrismaClientMock.mockReturnValue(createPrismaMock());

    await expect(
      upsertProjectScore({
        ...validInput,
        scores: [{ criterionName: "创新性", score: 9 }],
      })
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "评分维度已更新，请刷新页面后重新打分。",
        fieldErrors: {
          scores: ["评分维度已更新，请刷新页面后重新打分。"],
        },
      },
    });
  });

  it("upserts the judge score and trims optional comments", async () => {
    authMock.mockResolvedValue({ user: { id: "judge-1", role: "USER" } });
    const projectScoreUpsert = vi.fn().mockResolvedValue({
      id: "score-1",
    });
    const prisma = createPrismaMock({
      projectScoreUpsert,
    });
    getPrismaClientMock.mockReturnValue(prisma);

    await expect(
      upsertProjectScore({
        ...validInput,
        comment: "  保持这个版本为最终意见。  ",
      })
    ).resolves.toEqual({
      success: true,
      data: {
        id: "score-1",
      },
    });

    expect(projectScoreUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          judgeId: "judge-1",
          comment: "保持这个版本为最终意见。",
        }),
        update: expect.objectContaining({
          comment: "保持这个版本为最终意见。",
        }),
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/judge/events/${validInput.eventId}`);
  });
});
