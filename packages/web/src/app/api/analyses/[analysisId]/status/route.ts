import { auth } from "@/lib/auth";
import { getAnalysisStatus } from "@/lib/db/analyses";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ analysisId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  const { analysisId } = await params;
  const analysis = await getAnalysisStatus(analysisId, session.user.id);
  if (!analysis) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Analysis not found" } }, { status: 404 });
  }
  return NextResponse.json({ data: analysis });
}
