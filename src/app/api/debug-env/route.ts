import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasAuthSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    hasAdminEmails: Boolean(process.env.ADMIN_EMAILS?.trim()),
    hasGithubId: Boolean(process.env.AUTH_GITHUB_ID?.trim()),
    hasGithubSecret: Boolean(process.env.AUTH_GITHUB_SECRET?.trim()),
    hasGoogleId: Boolean(process.env.AUTH_GOOGLE_ID?.trim()),
    hasGoogleSecret: Boolean(process.env.AUTH_GOOGLE_SECRET?.trim()),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
  });
}
