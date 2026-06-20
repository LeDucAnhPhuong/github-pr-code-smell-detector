"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";

export interface RepoRow {
  id: string;
  fullName: string;
  language: string;
  visibility: "Public" | "Private";
  defaultBranch: string;
  openPRs: number;
  updatedAtMs: number;
  updatedAtLabel: string;
}

export function RepositoriesTable({ rows }: { rows: RepoRow[] }) {
  const columns = useMemo<ColumnDef<RepoRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Repository",
        cell: ({ row }) => (
          <Link className="link cell-strong" href={`/repositories/${row.original.id}`}>
            {row.original.fullName}
          </Link>
        ),
      },
      {
        accessorKey: "language",
        header: "Language",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => <span className="secondary">{getValue<string>()}</span>,
      },
      {
        accessorKey: "visibility",
        header: "Visibility",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => <span className="secondary">{getValue<string>()}</span>,
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: () => (
          <span className="status">
            <span className="dot" style={{ background: "var(--ok-dot)" }} />
            Connected
          </span>
        ),
      },
      {
        accessorKey: "openPRs",
        header: "Open PRs",
        cell: ({ getValue }) => <span className="secondary">{getValue<number>()}</span>,
      },
      {
        accessorKey: "defaultBranch",
        header: "Branch",
        enableSorting: false,
        cell: ({ getValue }) => <span className="code">{getValue<string>()}</span>,
      },
      {
        accessorKey: "updatedAtMs",
        header: "Updated",
        cell: ({ row }) => <span className="muted">{row.original.updatedAtLabel}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Link className="link" href={`/repositories/${row.original.id}`}>
            View
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search repositories…"
      facets={[
        { columnId: "language", title: "Language" },
        { columnId: "visibility", title: "Visibility" },
      ]}
      emptyMessage="No repositories match your filters."
    />
  );
}
