import type { Metadata } from "next";
import { getPlansAdmin } from "@github-pr-code-smell-detector/core/db/admin";
import { PlansClient } from "./plans-client";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const plans = await getPlansAdmin();
  const initial = plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    repositoryLimit: p.repositoryLimit,
    analysisQuota: p.analysisQuota,
    tokenQuota: p.tokenQuota,
    hasCheckAnnotations: p.hasCheckAnnotations,
    hasHistoricalReports: p.hasHistoricalReports,
    isActive: p.isActive,
  }));
  return <PlansClient initial={initial} />;
}
