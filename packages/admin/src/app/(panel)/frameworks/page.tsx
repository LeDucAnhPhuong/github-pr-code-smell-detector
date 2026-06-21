import type { Metadata } from "next";
import { getFrameworks } from "@github-pr-code-smell-detector/core/db/admin";
import { FrameworksClient } from "./frameworks-client";

export const metadata: Metadata = { title: "Frameworks" };

export default async function FrameworksPage() {
  const frameworks = await getFrameworks();
  const initial = frameworks.map((f) => ({
    id: f.id,
    name: f.name,
    supportedExtensions: f.supportedExtensions,
    isActive: f.isActive,
    rules: f._count.rules,
  }));
  return <FrameworksClient initial={initial} />;
}
