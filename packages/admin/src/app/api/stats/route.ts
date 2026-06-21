import { NextResponse } from "next/server";
import {
  getAdminStats,
  getAnalysisStatusCounts,
  getRecentAnalyses,
} from "@github-pr-code-smell-detector/core/db/stats";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const [stats, statusCounts, recent] = await Promise.all([
    getAdminStats(),
    getAnalysisStatusCounts(),
    getRecentAnalyses(),
  ]);
  return NextResponse.json({ data: { stats, statusCounts, recent } });
}
