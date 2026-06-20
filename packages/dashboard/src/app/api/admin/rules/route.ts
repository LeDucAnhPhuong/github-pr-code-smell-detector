import { auth } from "@/lib/auth";
import { getRules, createRule, updateRule } from "@/lib/db/admin";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  const rules = await getRules();
  return NextResponse.json({ data: rules });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  try {
    const body = await req.json();
    const rule = await createRule(body);
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: String(e) } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const rule = await updateRule(id, data);
    return NextResponse.json({ data: rule });
  } catch (e: unknown) {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: String(e) } }, { status: 500 });
  }
}
