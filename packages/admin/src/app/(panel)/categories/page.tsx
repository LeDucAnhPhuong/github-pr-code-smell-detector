import type { Metadata } from "next";
import { getCategories } from "@github-pr-code-smell-detector/core/db/admin";
import { CategoriesClient } from "./categories-client";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getCategories();
  const initial = categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    defaultSeverity: c.defaultSeverity as "error" | "warning" | "info",
    isActive: c.isActive,
    rules: c._count.rules,
  }));
  return <CategoriesClient initial={initial} />;
}
