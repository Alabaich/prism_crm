import React from "react";

// ── Column definition ─────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  label: string;
  width?: string;           // e.g. "w-12", "w-48"
  align?: "left" | "right" | "center";
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
  // Selection API — stubbed for future use
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

const SkeletonRow: React.FC<{ columns: number }> = ({ columns }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div
          className="h-4 bg-slate-100 rounded-lg"
          style={{ width: i === 0 ? "40%" : i === columns - 1 ? "60%" : "75%" }}
        />
      </td>
    ))}
  </tr>
);

// ── Component ─────────────────────────────────────────────────────────────────

function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found.",
  emptyIcon,
  rowKey,
  onRowClick,
  skeletonRows = 6,
  selectedKeys,
  onSelectionChange,
}: DataTableProps<T>) {

  const alignClass = (align?: "left" | "right" | "center") => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
        <table className="w-full text-left text-sm whitespace-nowrap">

          {/* Header */}
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 ${col.width ?? ""} ${alignClass(col.align)}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} columns={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-400 italic">
                  {emptyIcon && (
                    <div className="flex justify-center mb-3 opacity-20">
                      {emptyIcon}
                    </div>
                  )}
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = rowKey(row);
                const isSelected = selectedKeys?.has(key) ?? false;

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`
                      transition-colors
                      ${onRowClick ? "cursor-pointer" : ""}
                      ${isSelected ? "bg-blue-50" : "hover:bg-slate-50/80"}
                    `}
                  >
                    {columns.map((col) => {
                      const value = (row as any)[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`px-6 py-4 ${col.width ?? ""} ${alignClass(col.align)}`}
                        >
                          {col.render ? col.render(value, row, index) : value ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}

export default DataTable;
export type { Column };