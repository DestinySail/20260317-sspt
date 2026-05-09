import { cache } from "react";
import { auth } from "@/auth";

export const getOptionalSession = cache(async function getOptionalSession() {
  if (!process.env.AUTH_SECRET?.trim()) {
    return null;
  }

  try {
    return await auth();
  } catch {
    return null;
  }
});
