'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  /** محاذاة الأرقام لليسار تجعل المقارنة البصرية أسهل في جدول عربي. */
  numeric?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
}

/**
 * جدول بيانات بترتيب فوري.
 * لا ترقيم صفحات: نائب المدير يحتاج رؤية كل المعلمات دفعة واحدة للمقارنة.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  rowTone,
  emptyAr = 'لا توجد بيانات.',
  initialSort,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  onRowClick?: (row: T) => void;
  rowTone?: (row: T) => 'danger' | 'warn' | null;
  emptyAr?: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
}) {
  const [sort, setSort] = React.useState(initialSort ?? null);

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv), 'ar', { numeric: true }) * factor;
    });
  }, [rows, sort, columns]);

  if (rows.length === 0) {
    return <p className="px-5 py-10 text-center text-xs text-ink-muted">{emptyAr}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-right">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={cn('table-head px-3 py-2', column.numeric && 'text-left')}
              >
                {column.sortValue ? (
                  <button
                    onClick={() =>
                      setSort((current) =>
                        current?.key === column.key
                          ? { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
                          : { key: column.key, dir: 'asc' },
                      )
                    }
                    className="inline-flex items-center gap-1 transition-colors hover:text-ink"
                  >
                    {column.header}
                    <span className="text-[8px]">
                      {sort?.key === column.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const tone = rowTone?.(row);
            return (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-line last:border-0',
                  onRowClick && 'cursor-pointer',
                  tone === 'danger'
                    ? 'bg-danger-soft/40 hover:bg-danger-soft'
                    : tone === 'warn'
                      ? 'bg-warn-soft/40 hover:bg-warn-soft'
                      : 'hover:bg-surface-sunken',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-3 py-2 text-xs align-middle', column.numeric && 'tabular text-left')}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
