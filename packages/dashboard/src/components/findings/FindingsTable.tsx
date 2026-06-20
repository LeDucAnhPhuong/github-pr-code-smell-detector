"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { Severity } from "@/types";
import { DataTable } from "@/components/ui/DataTable";
import { SeverityBadge } from "@/components/findings/SeverityBadge";

export interface FindingRow {
  id: string;
  severity: Severity;
  ruleName: string;
  category: string;
  filePath: string;
  fileShort: string;
  lineStart: number;
  status: string;
}

const STATUS_DOT: Record<string, string> = {
  OPEN: "var(--run-dot)",
  REVIEWED: "var(--ok-dot)",
  IGNORED: "var(--idle-dot)",
};

export function FindingsTable({
  rows,
  repoId,
  prId,
}: {
  rows: FindingRow[];
  repoId: string;
  prId: string;
}) {
  const columns = useMemo<ColumnDef<FindingRow>[]>(
    () => [
      {
        accessorKey: "severity",
        header: "Severity",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => <SeverityBadge severity={getValue<Severity>()} />,
      },
      {
        accessorKey: "ruleName",
        header: "Rule",
        cell: ({ getValue }) => (
          <span className="cell-strong mono" style={{ fontSize: 12 }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => <span className="secondary">{getValue<string>()}</span>,
      },
      {
        accessorKey: "filePath",
        header: "File",
        cell: ({ row }) => <span className="code">{row.original.fileShort}</span>,
      },
      {
        accessorKey: "lineStart",
        header: "Line",
        cell: ({ getValue }) => <span className="muted">{getValue<number>()}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => {
          const s = getValue<string>();
          return (
            <span className="status">
              <span className="dot" style={{ background: STATUS_DOT[s] ?? "var(--idle-dot)" }} />
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Link className="link" href={`/repositories/${repoId}/pulls/${prId}/findings/${row.original.id}`}>
            View
          </Link>
        ),
      },
    ],
    [repoId, prId]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search file or rule…"
      facets={[
        {
          columnId: "severity",
          title: "Severity",
          options: [
            { value: "error", label: "High" },
            { value: "warning", label: "Medium" },
            { value: "info", label: "Low" },
          ],
        },
        { columnId: "category", title: "Category" },
        {
          columnId: "status",
          title: "Status",
          options: [
            { value: "OPEN", label: "Open" },
            { value: "REVIEWED", label: "Reviewed" },
            { value: "IGNORED", label: "Ignored" },
          ],
        },
      ]}
      emptyMessage="No findings match your filters."
    />
  );
}
