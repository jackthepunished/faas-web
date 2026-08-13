import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { EmptyState } from './primitives';
import { cn } from '@/lib/utils';

/**
 * The shape almost every resource page shares: a filter row, a sortable
 * table, and an empty state. Pages supply columns and rows; sorting,
 * searching, and the chrome live here.
 */

export interface Column<T> {
  /** Property used for sorting; also the React key. */
  key: keyof T & string;
  label: string;
  /** Right-aligns and sorts descending on first click. */
  numeric?: boolean;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  /** Tailwind width utility, e.g. 'w-40'. */
  width?: string;
}

export interface ResourceTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  initialSort?: { key: keyof T & string; dir: 'asc' | 'desc' };
  onRowClick?: (row: T) => void;
  /** Fields searched by the filter box. Omit to hide the box. */
  searchKeys?: (keyof T & string)[];
  searchPlaceholder?: string;
  /** Extra controls rendered in the filter row. */
  filters?: ReactNode;
  emptyMessage?: string;
  minWidth?: string;
}

export function ResourceTable<T extends { id: string }>({
  rows,
  columns,
  initialSort,
  onRowClick,
  searchKeys,
  searchPlaceholder = 'Filter…',
  filters,
  emptyMessage = 'Nothing here yet.',
  minWidth = 'min-w-[820px]',
}: ResourceTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered =
      q && searchKeys?.length
        ? rows.filter((row) =>
            searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
          )
        : rows;

    if (!sort) return filtered;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [rows, query, sort, searchKeys]);

  const toggleSort = (col: Column<T>) => {
    if (col.sortable === false) return;
    setSort((prev) =>
      prev?.key === col.key
        ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: col.numeric ? 'desc' : 'asc' }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {(searchKeys?.length || filters) && (
        <div className="flex flex-wrap items-center gap-3">
          {searchKeys?.length ? (
            <label className="relative flex min-w-56 flex-1 items-center sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/50"
              />
            </label>
          ) : null}
          {filters}
          <span className="ml-auto text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
            {visible.length} of {rows.length}
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className={cn('w-full text-sm', minWidth)}>
              <thead>
                <tr className="border-b border-border text-left">
                  {columns.map((col) => {
                    const isSorted = sort?.key === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={
                          isSorted ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                        }
                        className={cn('px-4 py-3', col.numeric && 'text-right', col.width)}
                      >
                        {col.sortable === false ? (
                          <span className="label-mono text-muted-foreground">{col.label}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleSort(col)}
                            className={cn(
                              'label-mono inline-flex items-center gap-1 transition-colors hover:text-foreground',
                              col.numeric && 'flex-row-reverse',
                              isSorted ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {col.label}
                            {isSorted &&
                              (sort!.dir === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              ))}
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'transition-colors hover:bg-muted/40',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3',
                          col.numeric && 'text-right [font-variant-numeric:tabular-nums]'
                        )}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small pill for enum-ish cells, coloured by a caller-supplied token. */
export function Pill({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs',
        !color && 'border-border text-muted-foreground'
      )}
      style={
        color
          ? { borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, color }
          : undefined
      }
    >
      {label}
    </span>
  );
}
