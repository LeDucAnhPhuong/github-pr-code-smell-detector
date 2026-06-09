import { auth } from "@/lib/auth";
import { getRepository, deleteRepository } from "@/lib/db/repositories";
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
  return NextResponse.json({ data: repo });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  const { repoId } = await params;
  await deleteRepository(repoId, session.user.id);
  return NextResponse.json({ data: { deleted: true } });
}
