import { auth } from "@/lib/auth";
import { createRepository, getRepositories } from "@/lib/db/repositories";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  try {
    const repos = await getRepositories(session.user.id);
    return NextResponse.json({ data: repos });
  } catch {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch repositories" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { githubId, owner, name, fullName, isPrivate, language } = body;
    if (!githubId || !owner || !name || !fullName) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Missing required fields" } }, { status: 400 });
    }
    const repo = await createRepository(session.user.id, { githubId, owner, name, fullName, isPrivate, language });
    return NextResponse.json({ data: repo }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create repository";
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: msg } }, { status: 500 });
  }
}
