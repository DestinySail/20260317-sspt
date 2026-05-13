import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function GET() {
  const result: Record<string, unknown> = {
    hasAuthSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    hasGithubId: Boolean(process.env.AUTH_GITHUB_ID?.trim()),
    hasGithubSecret: Boolean(process.env.AUTH_GITHUB_SECRET?.trim()),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
  };

  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    result.dbConnection = "ok";

    const userCount = await prisma.user.count();
    result.userCount = userCount;
  } catch (error) {
    result.dbConnection = "failed";
    result.dbError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(result);
}
