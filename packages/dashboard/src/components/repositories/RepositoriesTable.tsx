"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";

export interface RepoRow {
  id: string;
  fullName: string;
  language: string;
  visibility: string;
  defaultBranch: string;
  openPRs: number;
  updatedAtMs: number;
  updatedAtLabel: string;
}

export function RepositoriesTable({ rows }: { rows: RepoRow[] }) {
  const t = useTranslations("repositories");
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
        cell: () => (
          <span className="status">
            <span className="dot" style={{ background: "var(--ok-dot)" }} />
            {t("connected")}
          </span>
        ),
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
        cell: ({ row }) => (
          <Link className="link" href={`/repositories/${row.original.id}`}>
            {t("view")}
          </Link>
        ),
      },
    ],
    [t]
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
