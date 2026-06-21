import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { UserRole } from "./types";

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
  },
  events: {
    // Assign the Free plan to brand-new users. This MUST run in `createUser`
    // (not the `signIn` callback): for a first-time OAuth sign-in, `signIn`
    // fires BEFORE the adapter persists the User row, so creating an
    // FK-bound TenantSubscription there fails with a foreign-key violation
    // (TenantSubscription_userId_fkey) and surfaces as Auth.js `AccessDenied`.
    async createUser({ user }) {
      if (!user.id) return;
      try {
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
      } catch (err) {
        // Never block sign-in if plan assignment fails; log for diagnosis.
        console.error("[auth] Failed to assign Free plan to new user:", err);
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
