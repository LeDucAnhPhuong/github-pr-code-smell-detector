"use client";

import { Github } from "lucide-react";

interface InstallAppButtonProps {
  slug: string;
  label?: string;
}

export function InstallAppButton({ slug, label = "Cài GitHub App" }: InstallAppButtonProps) {
  const href = slug
    ? `https://github.com/apps/${slug}/installations/new`
    : undefined;

  if (!href) {
    return (
      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Chưa cấu hình GITHUB_APP_SLUG — không thể tạo liên kết cài đặt.
      </span>
    );
  }

  return (
    <a href={href} className="btn btn-primary">
      <Github className="w-4 h-4" />
      {label}
    </a>
  );
}
