"use client";

// Reusable client-side data table (TanStack Table v8) for the new design system.
// Search / sort / faceted filter / pagination all operate on the rows already
// fetched by the server — no new API calls or logic.

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  X,
  Check,
  SlidersHorizontal,
} from "lucide-react";

export interface FacetConfig {
  columnId: string;
  title: string;
  options?: { value: string; label: string }[];
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  facets?: FacetConfig[];
  pageSize?: number;
  emptyMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  facets = [],
  pageSize = 10,
  emptyMessage,
}: DataTableProps<TData, TValue>) {
  const t = useTranslations("table");
  const searchText = searchPlaceholder ?? t("searchPlaceholder");
  const emptyText = emptyMessage ?? t("noResults");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    initialState: { pagination: { pageSize } },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="card" style={{ overflow: "visible" }}>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="tsearch">
          <Search />
          <input
            className="input"
            placeholder={searchText}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>

        {facets.map((f) => {
          const col = table.getColumn(f.columnId);
          if (!col) return null;
          return <FacetFilter key={f.columnId} column={col} title={f.title} options={f.options} />;
        })}

        {(columnFilters.length > 0 || globalFilter) && (
          <button
            className="filter-btn"
            style={{ borderStyle: "solid" }}
            onClick={() => {
              table.resetColumnFilters();
              setGlobalFilter("");
            }}
          >
            {t("reset")} <X className="ic" />
          </button>
        )}

        <div className="spacer" />
        <ViewMenu table={table} />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`${canSort ? "sortable" : ""} ${dir || ""}`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="sort">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort &&
                            (dir === "asc" ? (
                              <ArrowUp className="arrow" width={12} height={12} />
                            ) : dir === "desc" ? (
                              <ArrowDown className="arrow" width={12} height={12} />
                            ) : (
                              <ChevronsUpDown className="arrow" width={12} height={12} />
                            ))}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: "40px", color: "var(--ink-3)" }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      <div className="table-foot">
        <span>
          {t("rowCount", { count: totalRows })}
        </span>
        <div className="row" style={{ gap: 14 }}>
          <span>
            {t("rowsPerPage")}
            <select
              className="select"
              style={{ display: "inline-flex", width: "auto", height: 26, padding: "0 24px 0 8px", marginLeft: 6, fontSize: 12 }}
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </span>
          <span>
            {t("pageOf", {
              page: table.getState().pagination.pageIndex + 1,
              total: Math.max(table.getPageCount(), 1),
            })}
          </span>
          <div className="pager">
            <button className="pg" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft width={13} height={13} />
            </button>
            <button className="pg" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight width={13} height={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── faceted filter dropdown ─────────────────────────────────────────── */
function FacetFilter<TData>({
  column,
  title,
  options,
}: {
  column: import("@tanstack/react-table").Column<TData, unknown>;
  title: string;
  options?: { value: string; label: string }[];
}) {
  const t = useTranslations("table");
  const facetCounts = column.getFacetedUniqueValues();
  const selected = new Set((column.getFilterValue() as string[]) ?? []);
  const opts =
    options ??
    Array.from(facetCounts.keys())
      .filter((v): v is string => typeof v === "string")
      .sort()
      .map((v) => ({ value: v, label: v }));

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    column.setFilterValue(next.size ? Array.from(next) : undefined);
  };

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button className="filter-btn">
          <PlusCircle className="ic" />
          {title}
          {selected.size > 0 && (
            <span className="badge badge-neutral" style={{ padding: "1px 6px" }}>
              {selected.size}
            </span>
          )}
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="menu" align="start" sideOffset={6} style={{ minWidth: 200, zIndex: 50 }}>
          <Dropdown.Label className="muted" style={{ fontSize: 11, padding: "4px 8px" }}>
            {t("filterBy", { title: title.toLowerCase() })}
          </Dropdown.Label>
          {opts.map((o) => {
            const isOn = selected.has(o.value);
            const count = facetCounts.get(o.value) ?? 0;
            return (
              <div key={o.value} className="menu-item" onClick={() => toggle(o.value)}>
                <span className={`check ${isOn ? "" : "empty"}`}>
                  {isOn && <Check width={10} height={10} color="#fff" />}
                </span>
                {o.label}
                <span className="muted" style={{ marginLeft: "auto" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

/* ── column visibility menu ──────────────────────────────────────────── */
function ViewMenu<TData>({ table }: { table: import("@tanstack/react-table").Table<TData> }) {
  const t = useTranslations("table");
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button className="filter-btn" style={{ borderStyle: "solid" }}>
          <SlidersHorizontal className="ic" />
          {t("view")}
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="menu" align="end" sideOffset={6} style={{ minWidth: 180, zIndex: 50 }}>
          <Dropdown.Label className="muted" style={{ fontSize: 11, padding: "4px 8px" }}>
            {t("toggleColumns")}
          </Dropdown.Label>
          {table
            .getAllColumns()
            .filter((c) => c.getCanHide())
            .map((c) => {
              const isOn = c.getIsVisible();
              return (
                <div key={c.id} className="menu-item" onClick={() => c.toggleVisibility(!isOn)}>
                  <span className={`check ${isOn ? "" : "empty"}`}>
                    {isOn && <Check width={10} height={10} color="#fff" />}
                  </span>
                  <span style={{ textTransform: "capitalize" }}>{c.id}</span>
                </div>
              );
            })}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
