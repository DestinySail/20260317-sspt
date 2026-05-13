import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject, submitProject, updateProject } from "@/app/(app)/my/projects/actions";
import type { ProjectFormInput } from "@/lib/projects/schema";

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

const validInput: ProjectFormInput = {
  eventId: "11111111-1111-4111-8111-111111111111",
  name: "Factory Copilot",
  description: "面向制造企业的多角色智能体协作平台。",
  sourceUrl: "https://github.com/example/factory-copilot",
  demoUrl: "https://demo.example.com/factory-copilot",
  videoUrl: "https://video.example.com/factory-copilot",
  track: "企业智能体",
  challenges: ["流程自动化"],
};

function createPrismaMock(overrides?: {
  eventFindUnique?: ReturnType<typeof vi.fn>;
  registrationFindUnique?: ReturnType<typeof vi.fn>;
  projectFindUnique?: ReturnType<typeof vi.fn>;
  projectCreate?: ReturnType<typeof vi.fn>;
  projectUpdate?: ReturnType<typeof vi.fn>;
  projectUpsert?: ReturnType<typeof vi.fn>;
}) {
  return {
    event: {
      findUnique:
        overrides?.eventFindUnique ??
        vi.fn().mockResolvedValue({
          id: validInput.eventId,
          slug: "factory-demo-day",
          published: true,
          submissionStart: new Date("2026-04-05T09:00:00.000Z"),
          submissionEnd: new Date("2026-04-10T09:00:00.000Z"),
          tracks: [{ name: "企业智能体", description: "面向内部运营场景" }],
          challenges: [{ title: "流程自动化", description: "减少重复人工操作" }],
        }),
    },
    registration: {
      findUnique:
        overrides?.registrationFindUnique ??
        vi.fn().mockResolvedValue({
          id: "registration-1",
          status: "CONFIRMED",
          teamName: "AI 冲刺队",
        }),
    },
    project: {
      findUnique: overrides?.projectFindUnique ?? vi.fn().mockResolvedValue(null),
      create:
        overrides?.projectCreate ??
        vi.fn().mockResolvedValue({
          id: "project-1",
          status: "DRAFT",
        }),
      update:
        overrides?.projectUpdate ??
        vi.fn().mockResolvedValue({
          id: "project-1",
          status: "DRAFT",
        }),
      upsert:
        overrides?.projectUpsert ??
        vi.fn().mockResolvedValue({
          id: "project-1",
          status: "FINAL",
        }),
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-07T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("project actions", () => {
  it("rejects unauthenticated create requests", async () => {
    authMock.mockResolvedValue(null);

    await expect(createProject(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("rejects creates outside the submission window", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    getPrismaClientMock.mockReturnValue(
      createPrismaMock({
        eventFindUnique: vi.fn().mockResolvedValue({
          id: validInput.eventId,
          slug: "factory-demo-day",
          published: true,
          submissionStart: new Date("2026-04-08T09:00:00.000Z"),
          submissionEnd: new Date("2026-04-10T09:00:00.000Z"),
          tracks: [{ name: "企业智能体", description: "面向内部运营场景" }],
          challenges: [{ title: "流程自动化", description: "减少重复人工操作" }],
        }),
      })
    );

    await expect(createProject(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "CONFLICT",
        message: "当前不在作品提交时间窗口内。",
      },
    });
  });

  it("rejects project writes for non-confirmed registrations", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    getPrismaClientMock.mockReturnValue(
      createPrismaMock({
        registrationFindUnique: vi.fn().mockResolvedValue({
          id: "registration-1",
          status: "ACCEPTED",
          teamName: "AI 冲刺队",
        }),
      })
    );

    await expect(createProject(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "需要先获得报名确认才能提交作品。",
      },
    });
  });

  it("rejects duplicate creates when a project already exists", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    getPrismaClientMock.mockReturnValue(
      createPrismaMock({
        projectFindUnique: vi.fn().mockResolvedValue({ id: "project-1" }),
      })
    );

    await expect(createProject(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "CONFLICT",
        message: "你已创建过该赛事作品，请直接继续编辑。",
      },
    });
  });

  it("returns not found when updating before any draft exists", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    getPrismaClientMock.mockReturnValue(createPrismaMock());

    await expect(updateProject(validInput)).resolves.toMatchObject({
      success: false,
      error: {
        code: "NOT_FOUND",
      },
    });
  });

  it("upserts final submissions and syncs the confirmed team name", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const projectUpsert = vi.fn().mockResolvedValue({
      id: "project-1",
      status: "FINAL",
    });
    const prisma = createPrismaMock({
      projectUpsert,
    });
    getPrismaClientMock.mockReturnValue(prisma);

    await expect(submitProject(validInput)).resolves.toEqual({
      success: true,
      data: {
        id: "project-1",
        status: "FINAL",
      },
    });

    expect(projectUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          teamName: "AI 冲刺队",
          status: "FINAL",
        }),
        update: expect.objectContaining({
          teamName: "AI 冲刺队",
          status: "FINAL",
        }),
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/my/projects");
  });
});
