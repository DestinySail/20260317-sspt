import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { getRoleForEmail } from "@/lib/access-control";
import { getPrismaClient } from "@/lib/prisma";
import { configureServerProxy } from "@/lib/server-proxy";

configureServerProxy();

const prisma = process.env.DATABASE_URL ? getPrismaClient() : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  ...(prisma
    ? {
        adapter: PrismaAdapter(prisma),
        events: {
          async signIn({ user }) {
            if (!user.id) {
              return;
            }

            await prisma.user.updateMany({
              where: { id: user.id },
              data: {
                role: getRoleForEmail(user.email),
                emailVerified: new Date(),
              },
            });
          },
        },
      }
    : {}),
});
