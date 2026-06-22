"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  lineStart: number | null;
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
  const t = useTranslations("findings");
  const tStatus = useTranslations("findingStatus");
  const tSeverity = useTranslations("severity");

  const columns = useMemo<ColumnDef<FindingRow>[]>(
    () => [
      {
        accessorKey: "severity",
        header: t("colSeverity"),
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => <SeverityBadge severity={getValue<Severity>()} />,
      },
      {
        accessorKey: "ruleName",
        header: t("colRule"),
        cell: ({ getValue }) => (
          <span className="cell-strong mono" style={{ fontSize: 12 }}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: t("colCategory"),
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => <span className="secondary">{getValue<string>()}</span>,
      },
      {
        accessorKey: "filePath",
        header: t("colFile"),
        cell: ({ row }) => <span className="code">{row.original.fileShort}</span>,
      },
      {
        accessorKey: "lineStart",
        header: t("colLine"),
        cell: ({ getValue }) => <span className="muted">{getValue<number | null>() ?? "—"}</span>,
      },
      {
        accessorKey: "status",
        header: t("colStatus"),
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => {
          const s = getValue<string>();
          return (
            <span className="status">
              <span className="dot" style={{ background: STATUS_DOT[s] ?? "var(--idle-dot)" }} />
              {tStatus(s)}
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
            {t("view")}
          </Link>
        ),
      },
    ],
    [repoId, prId, t, tStatus]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder={t("searchPlaceholder")}
      facets={[
        {
          columnId: "severity",
          title: t("colSeverity"),
          options: [
            { value: "error", label: tSeverity("high") },
            { value: "warning", label: tSeverity("medium") },
            { value: "info", label: tSeverity("low") },
          ],
        },
        { columnId: "category", title: t("colCategory") },
        {
          columnId: "status",
          title: t("colStatus"),
          options: [
            { value: "OPEN", label: tStatus("OPEN") },
            { value: "REVIEWED", label: tStatus("REVIEWED") },
            { value: "IGNORED", label: tStatus("IGNORED") },
          ],
        },
      ]}
      emptyMessage={t("emptyFiltered")}
    />
  );
}
