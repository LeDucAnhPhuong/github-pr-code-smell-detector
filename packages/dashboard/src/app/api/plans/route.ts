import { getAllPlans } from "@/lib/db/billing";
import { NextResponse } from "next/server";

/**
 * Public list of active subscription plans, consumed by the marketing landing
 * site (a separate app) so its pricing table stays in sync with the seeded
 * plans. No auth — this is public catalogue data. Cached at the edge for an
 * hour; plans change rarely.
 */
export async function GET() {
  try {
    const plans = await getAllPlans();
    const data = plans.map((p) => ({
      id: p.id,
      name: p.name,
      // Decimal -> number for JSON; price is in VND (whole dong).
      price: Math.round(Number(p.price)),
      repositoryLimit: p.repositoryLimit,
      analysisQuota: p.analysisQuota,
      hasCheckAnnotations: p.hasCheckAnnotations,
      hasHistoricalReports: p.hasHistoricalReports,
    }));

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          // Allow the landing origin (or any) to read this if ever fetched client-side.
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load plans";
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: msg } }, { status: 500 });
  }
}
