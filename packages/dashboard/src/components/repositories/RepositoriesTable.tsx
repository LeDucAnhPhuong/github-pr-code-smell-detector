"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { disconnectRepository, reactivateRepository } from "@/lib/actions/connect";

export interface RepoRow {
  id: string;
  fullName: string;
  language: string;
  visibility: string;
  defaultBranch: string;
  openPRs: number;
  updatedAtMs: number;
  updatedAtLabel: string;
  connectionState: string;
}

const STATE_DOT: Record<string, string> = {
  READY: "var(--ok-dot)",
  INDEXING: "var(--run-dot)",
  DETECTING: "var(--run-dot)",
  SUSPENDED: "var(--idle-dot)",
  REJECTED: "var(--fail-dot)",
  INDEX_FAILED: "var(--fail-dot)",
};

export function RepositoriesTable({ rows }: { rows: RepoRow[] }) {
  const t = useTranslations("repositories");
  const [pending, startTransition] = useTransition();
  const columns = useMemo<ColumnDef<RepoRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: t("colRepository"),
        cell: ({ row }) => (
          <Link className="link cell-strong" href={`/repositories/${row.original.id}`}>
            {row.original.fullName}
          </Link>
        ),
      },
      {
        accessorKey: "language",
        header: t("colLanguage"),
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => <span className="secondary">{getValue<string>()}</span>,
      },
      {
        accessorKey: "visibility",
        header: t("colVisibility"),
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => <span className="secondary">{getValue<string>()}</span>,
      },
      {
        id: "status",
        header: t("colStatus"),
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original.connectionState;
          const label = s === "READY" ? t("connected") : t(`state${s}`);
          return (
            <span className="status">
              <span className="dot" style={{ background: STATE_DOT[s] ?? "var(--idle-dot)" }} />
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: "openPRs",
        header: t("colOpenPRs"),
        cell: ({ getValue }) => <span className="secondary">{getValue<number>()}</span>,
      },
      {
        accessorKey: "defaultBranch",
        header: t("colBranch"),
        enableSorting: false,
        cell: ({ getValue }) => <span className="code">{getValue<string>()}</span>,
      },
      {
        accessorKey: "updatedAtMs",
        header: t("colUpdated"),
        cell: ({ row }) => <span className="muted">{row.original.updatedAtLabel}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const { id, connectionState } = row.original;
          return (
            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <Link className="link" href={`/repositories/${id}`}>
                {t("view")}
              </Link>
              {connectionState === "SUSPENDED" && (
                <button
                  className="link"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await reactivateRepository(id); })}
                >
                  {t("reactivate")}
                </button>
              )}
              <button
                className="link"
                disabled={pending}
                style={{ color: "var(--fail-dot)" }}
                onClick={() => {
                  if (confirm(t("confirmDisconnect"))) startTransition(async () => { await disconnectRepository(id); });
                }}
              >
                {t("disconnect")}
              </button>
            </div>
          );
        },
      },
    ],
    [t, pending]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder={t("searchPlaceholder")}
      facets={[
        { columnId: "language", title: t("colLanguage") },
        { columnId: "visibility", title: t("colVisibility") },
      ]}
      emptyMessage={t("emptyFiltered")}
    />
  );
}
