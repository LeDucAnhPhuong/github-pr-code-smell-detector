import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

type RequireAdminResult =
  | { ok: true; session: Session; error: null }
  | { ok: false; session: null; error: NextResponse };

// Defense-in-depth: proxy.ts already blocks non-admins on /api/*, but every
// handler re-checks the role anyway.
export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return {
      ok: false,
      session: null,
      error: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      ),
    };
  }
  return { ok: true, session, error: null };
}
