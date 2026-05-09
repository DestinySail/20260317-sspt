import { cache } from "react";
import { Prisma } from "@prisma/client";
import { getEventPhase, type EventPhase } from "@/lib/events/phase";
import {
  buildProjectRankings,
  hasValidScores,
  type RankedProject,
} from "@/lib/reviews/ranking";
import { parseStoredJudgeScoreEntries } from "@/lib/reviews/schema";
import { getOptionalPrismaClient } from "@/lib/prisma";
import { parseEventJsonFields } from "@/lib/events/schema";

const reviewEventSelect = {
  id: true,
  name: true,
  slug: true,
  published: true,
  rankingsPublished: true,
  registrationStart: true,
  registrationEnd: true,
  submissionStart: true,
  submissionEnd: true,
  reviewStart: true,
  reviewEnd: true,
  scoringCriteria: true,
} satisfies Prisma.EventSelect;

const judgeProjectSelect = {
  id: true,
  name: true,
  description: true,
  teamName: true,
  sourceUrl: true,
  demoUrl: true,
  videoUrl: true,
  track: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  scores: {
    select: {
      id: true,
      judgeId: true,
      scores: true,
      comment: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ProjectSelect;

type ReviewEventRecord = Prisma.EventGetPayload<{ select: typeof reviewEventSelect }>;

type ReviewEvent = Omit<ReviewEventRecord, "scoringCriteria"> &
  ReturnType<typeof parseEventJsonFields> & {
    phase: EventPhase;
  };

export type JudgeAssignedEvent = {
  eventId: string;
  eventName: string;
  eventSlug: string;
  phase: EventPhase;
  reviewStart: Date;
  reviewEnd: Date;
  assignedAt: Date;
  finalProjectCount: number;
  scoredProjectCount: number;
  remainingProjectCount: number;
};

export type JudgeEventReviewData = {
  event: ReviewEvent;
  metrics: {
    finalProjectCount: number;
    scoredProjectCount: number;
    remainingProjectCount: number;
  };
  projects: Array<{
    id: string;
    name: string;
    description: string;
    teamName: string | null;
    sourceUrl: string | null;
    demoUrl: string | null;
    videoUrl: string | null;
    track: string | null;
    updatedAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
    currentJudgeScore: {
      id: string;
      comment: string | null;
      createdAt: Date;
      totalScore: number;
      entries: ReturnType<typeof parseStoredJudgeScoreEntries>;
    } | null;
  }>;
};

export type AdminEventJudgingData = {
  event: ReviewEvent;
  metrics: {
    assignedJudgeCount: number;
    finalProjectCount: number;
    scoredProjectCount: number;
    rankedProjectCount: number;
  };
  judges: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    assignedAt: Date;
    scoredProjectCount: number;
  }>;
  rankings: RankedProject[];
};

export async function listJudgeAssignedEvents(userId: string) {
  const prisma = getOptionalPrismaClient();

  if (!prisma) {
    return [] as JudgeAssignedEvent[];
  }

  try {
    const assignments = await prisma.eventJudge.findMany({
      where: { userId },
      select: {
        assignedAt: true,
        event: {
          select: reviewEventSelect,
        },
      },
      orderBy: [{ assignedAt: "desc" }],
    });

    if (assignments.length === 0) {
      return [] as JudgeAssignedEvent[];
    }

    const eventIds = assignments.map((assignment) => assignment.event.id);
    const [finalProjectCounts, scoredProjectCounts] = await Promise.all([
      prisma.project.groupBy({
        by: ["eventId"],
        where: {
          eventId: { in: eventIds },
          status: "FINAL",
        },
        _count: {
          _all: true,
        },
      }),
      prisma.projectScore.groupBy({
        by: ["eventId"],
        where: {
          eventId: { in: eventIds },
          judgeId: userId,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const finalCountMap = new Map(finalProjectCounts.map((item) => [item.eventId, item._count._all]));
    const scoredCountMap = new Map(scoredProjectCounts.map((item) => [item.eventId, item._count._all]));

    return assignments.map((assignment) => {
      const finalProjectCount = finalCountMap.get(assignment.event.id) ?? 0;
      const scoredProjectCount = scoredCountMap.get(assignment.event.id) ?? 0;

      return {
        eventId: assignment.event.id,
        eventName: assignment.event.name,
        eventSlug: assignment.event.slug,
        phase: getEventPhase(assignment.event),
        reviewStart: assignment.event.reviewStart,
        reviewEnd: assignment.event.reviewEnd,
        assignedAt: assignment.assignedAt,
        finalProjectCount,
        scoredProjectCount,
        remainingProjectCount: Math.max(finalProjectCount - scoredProjectCount, 0),
      };
    });
  } catch {
    return [] as JudgeAssignedEvent[];
  }
}

export const hasJudgeAssignments = cache(async function hasJudgeAssignments(userId: string) {
  const prisma = getOptionalPrismaClient();

  if (!prisma) {
    return false;
  }

  try {
    const count = await prisma.eventJudge.count({
      where: { userId },
    });

    return count > 0;
  } catch {
    return false;
  }
});

export async function getJudgeEventReviewData(eventId: string, userId: string) {
  const prisma = getOptionalPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const assignment = await prisma.eventJudge.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      select: {
        event: {
          select: reviewEventSelect,
        },
      },
    });

    if (!assignment) {
      return null;
    }

    const projects = await prisma.project.findMany({
      where: {
        eventId,
        status: "FINAL",
      },
      select: judgeProjectSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const event = mapReviewEvent(assignment.event);
    const judgeProjects = projects.map((project) => {
      const currentJudgeScoreRecord = project.scores.find((score) => score.judgeId === userId) ?? null;
      const currentJudgeEntries = currentJudgeScoreRecord
        ? parseStoredJudgeScoreEntries(currentJudgeScoreRecord.scores)
        : [];

      return {
        ...project,
        currentJudgeScore: currentJudgeScoreRecord
          ? {
              id: currentJudgeScoreRecord.id,
              comment: currentJudgeScoreRecord.comment,
              createdAt: currentJudgeScoreRecord.createdAt,
              totalScore: currentJudgeEntries.length
                ? Math.round(
                    currentJudgeEntries.reduce(
                      (sum, entry) => sum + (entry.score / entry.maxScore) * entry.weight,
                      0
                    ) * 100
                  ) / 100
                : 0,
              entries: currentJudgeEntries,
            }
          : null,
      };
    });

    return {
      event,
      metrics: {
        finalProjectCount: judgeProjects.length,
        scoredProjectCount: judgeProjects.filter((project) => project.currentJudgeScore).length,
        remainingProjectCount: judgeProjects.filter((project) => !project.currentJudgeScore).length,
      },
      projects: judgeProjects,
    } satisfies JudgeEventReviewData;
  } catch {
    return null;
  }
}

export async function getAdminEventJudgingData(eventId: string) {
  const prisma = getOptionalPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        ...reviewEventSelect,
        judges: {
          select: {
            assignedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [{ assignedAt: "asc" }],
        },
      },
    });

    if (!event) {
      return null;
    }

    const projects = await prisma.project.findMany({
      where: {
        eventId,
        status: "FINAL",
      },
      select: judgeProjectSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const reviewEvent = mapReviewEvent(event);
    const rankings = buildProjectRankings(
      reviewEvent.scoringCriteria,
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        teamName: project.teamName,
        track: project.track,
        scoreRecords: project.scores,
      }))
    );
    const judgeScoreCountMap = new Map<string, number>();

    for (const project of projects) {
      for (const scoreRecord of project.scores) {
        if (!hasValidScores(reviewEvent.scoringCriteria, [scoreRecord])) {
          continue;
        }

        judgeScoreCountMap.set(
          scoreRecord.judgeId,
          (judgeScoreCountMap.get(scoreRecord.judgeId) ?? 0) + 1
        );
      }
    }

    return {
      event: reviewEvent,
      metrics: {
        assignedJudgeCount: event.judges.length,
        finalProjectCount: projects.length,
        scoredProjectCount: projects.filter((project) =>
          hasValidScores(reviewEvent.scoringCriteria, project.scores)
        ).length,
        rankedProjectCount: rankings.length,
      },
      judges: event.judges.map((assignment) => ({
        userId: assignment.user.id,
        name: assignment.user.name,
        email: assignment.user.email,
        assignedAt: assignment.assignedAt,
        scoredProjectCount: judgeScoreCountMap.get(assignment.user.id) ?? 0,
      })),
      rankings,
    } satisfies AdminEventJudgingData;
  } catch {
    return null;
  }
}

export async function getPublishedEventRankingBySlug(slug: string) {
  const prisma = getOptionalPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: reviewEventSelect,
    });

    if (!event || !event.published || !event.rankingsPublished) {
      return null;
    }

    const reviewEvent = mapReviewEvent(event);
    const projects = await prisma.project.findMany({
      where: {
        eventId: event.id,
        status: "FINAL",
      },
      select: {
        id: true,
        name: true,
        teamName: true,
        track: true,
        scores: {
          select: {
            judgeId: true,
            scores: true,
          },
        },
      },
    });

    const rankings = buildProjectRankings(
      reviewEvent.scoringCriteria,
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        teamName: project.teamName,
        track: project.track,
        scoreRecords: project.scores,
      }))
    );

    if (rankings.length === 0) {
      return null;
    }

    return {
      event: reviewEvent,
      rankings,
    };
  } catch {
    return null;
  }
}

function mapReviewEvent(event: ReviewEventRecord): ReviewEvent {
  return {
    ...event,
    ...parseEventJsonFields({
      tracks: [],
      challenges: [],
      prizes: [],
      scoringCriteria: event.scoringCriteria,
      customFields: [],
    }),
    phase: getEventPhase(event),
  };
}
