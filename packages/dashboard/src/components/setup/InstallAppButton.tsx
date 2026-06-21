"use client";

import { useTranslations } from "next-intl";
import { Github } from "lucide-react";

interface InstallAppButtonProps {
  slug: string;
  label?: string;
}

export function InstallAppButton({ slug, label }: InstallAppButtonProps) {
  const t = useTranslations("setup");
  const href = slug
    ? `https://github.com/apps/${slug}/installations/new`
    : undefined;

  if (!href) {
    return (
      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {t("appSlugNotConfigured")}
      </span>
    );
  }

  return (
    <a href={href} className="btn btn-primary">
      <Github className="w-4 h-4" />
      {label ?? t("installApp")}
    </a>
  );
}
