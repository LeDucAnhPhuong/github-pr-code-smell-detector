export type PermSeverity = "critical" | "optional";

export interface PermissionStatus {
  /** Human-readable label shown in UI, e.g. "Checks write" */
  label: string;
  /** GitHub scope this maps to, e.g. "checks:write" */
  scope: string;
  /** Whether the granted scopes satisfy this permission */
  present: boolean;
  /** "critical" = bot cannot run without it; "optional" = feature degrades only */
  severity: PermSeverity;
  /** What breaks when this permission is missing (shown in the alert modal) */
  impact: string;
}

/**
 * Single source of truth for which GitHub permissions the app needs and whether
 * the granted OAuth scopes satisfy them. Used by both the Account page and the
 * global PermissionAlert so the two never disagree.
 */
export function getGithubPermissions(scopeString?: string | null): PermissionStatus[] {
  const scopes = scopeString?.split(",").map((s) => s.trim()) ?? [];
  const hasRepo = scopes.some((s) => s === "repo");
  const hasRepoRead = scopes.some((s) => s === "repo" || s === "public_repo");
  const hasChecks = scopes.some((s) => s.includes("checks"));

  return [
    {
      label: "Repository read",
      scope: "repo",
      present: hasRepoRead,
      severity: "critical",
      impact: "Không đọc được nội dung repo để phân tích.",
    },
    {
      label: "Pull Request read",
      scope: "repo",
      present: hasRepo,
      severity: "critical",
      impact: "Không đọc được PR/diff để chạy phân tích.",
    },
    {
      label: "PR comments write",
      scope: "repo",
      present: hasRepo,
      severity: "critical",
      impact: "Bot không đăng được comment review lên PR (chức năng chính).",
    },
    {
      label: "Checks write",
      scope: "checks:write",
      present: hasChecks,
      severity: "optional",
      impact:
        "Mất annotation inline & trạng thái check pass/fail trên PR; comment vẫn hoạt động bình thường.",
    },
  ];
}

export function getMissingPermissions(perms: PermissionStatus[]): PermissionStatus[] {
  return perms.filter((p) => !p.present);
}

/**
 * Stable key for a set of missing permissions, used to remember a dismissal.
 * If the set of missing permissions changes, the signature changes and a
 * previously dismissed alert reappears.
 */
export function missingSignature(missing: PermissionStatus[]): string {
  return missing
    .map((p) => p.scope)
    .sort()
    .join(",");
}
