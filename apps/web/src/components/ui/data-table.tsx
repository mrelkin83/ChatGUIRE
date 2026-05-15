"use client";

import { motion } from "framer-motion";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string;
}

export function DataTable<T>({ columns, data, loading, emptyMessage = "Sin datos", onRowClick, keyExtractor }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {columns.map((col) => (
                <th key={col.key} className={cn("px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {data.map((item, idx) => (
              <motion.tr
                key={keyExtractor(item)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "transition-colors hover:bg-[rgba(255,255,255,0.02)]",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-5 py-4 text-sm", col.className)}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-[var(--text-tertiary)]">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
