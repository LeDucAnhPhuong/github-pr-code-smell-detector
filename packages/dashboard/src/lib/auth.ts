import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { UserRole } from "@/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = (user as any).role as UserRole ?? "USER";
      }
      return session;
    },
    async signIn({ user }) {
      // Assign Free plan to new users on first sign-in
      if (user.id) {
        const existing = await prisma.tenantSubscription.findUnique({
          where: { userId: user.id },
        });
        if (!existing) {
          const freePlan = await prisma.subscriptionPlan.findUnique({
            where: { name: "Free" },
          });
          if (freePlan) {
            await prisma.tenantSubscription.create({
              data: {
                userId: user.id,
                planId: freePlan.id,
                status: "ACTIVE",
                renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
