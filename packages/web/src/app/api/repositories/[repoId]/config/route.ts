import { auth } from "@/lib/auth";
import { getRepository, updateRepositoryConfig } from "@/lib/db/repositories";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  const { repoId } = await params;
  const repo = await getRepository(repoId, session.user.id);
  if (!repo) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Repository not found" } }, { status: 404 });
  }
  return NextResponse.json({ data: repo.config ?? {} });
}

export async function PUT(req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  const { repoId } = await params;
  const config = await req.json();
  await updateRepositoryConfig(repoId, session.user.id, config);
  return NextResponse.json({ data: { saved: true, savedAt: new Date().toISOString() } });
}
