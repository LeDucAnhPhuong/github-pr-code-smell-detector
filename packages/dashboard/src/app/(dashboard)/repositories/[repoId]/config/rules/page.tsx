import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/db/repositories";
import { getRules } from "@/lib/db/admin";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getTranslations } from "next-intl/server";
import { disabledSystemRuleIds } from "@/lib/rules/select-rules";
import { STARTER_TEMPLATES } from "@/lib/rules/templates";
import {
  RepoRulesManager,
  type SystemRuleRow,
  type CustomRuleRow,
} from "@/components/rules/RepoRulesManager";

export default async function RuleSettingsPage({ params }: { params: Promise<{ repoId: string }> }) {
  const session = await auth();
  const { repoId } = await params;
  const repo = await getRepository(repoId, session!.user.id);
  if (!repo) notFound();

  const t = await getTranslations("rulesPage");

  const [allRules, repoRules] = await Promise.all([
    getRules(),
    prisma.repoRule.findMany({ where: { repositoryId: repoId }, orderBy: { createdAt: "desc" } }),
  ]);

  const disabled = disabledSystemRuleIds(repo.config);
  // Show system rules for the repo's framework (or all if none detected yet).
  const relevant = repo.frameworkId ? allRules.filter((r) => r.frameworkId === repo.frameworkId) : allRules;

  const systemRules: SystemRuleRow[] = relevant.map((r) => ({
    id: r.id,
    name: r.name,
    framework: r.framework.name,
    category: r.category.name,
    severity: r.defaultSeverity,
    enabled: !disabled.has(r.id),
  }));

  const customRules: CustomRuleRow[] = repoRules.map((r) => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
    appliesTo: r.appliesTo,
    bodyMd: r.bodyMd,
    isActive: r.isActive,
  }));

  return (
    <div className="page-w">
      <Breadcrumb
        items={[
          { label: t("breadcrumbRepos"), href: "/repositories" },
          { label: repo.fullName, href: `/repositories/${repoId}` },
          { label: t("breadcrumbConfig"), href: `/repositories/${repoId}/config` },
          { label: t("breadcrumbRules") },
        ]}
      />
      <h1 className="h1" style={{ marginBottom: 14 }}>
        {t("title")}
      </h1>

      <RepoRulesManager
        repoId={repoId}
        systemRules={systemRules}
        customRules={customRules}
        templates={STARTER_TEMPLATES}
      />
    </div>
  );
}
