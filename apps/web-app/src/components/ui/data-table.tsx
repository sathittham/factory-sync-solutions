import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';

/**
 * Per-column presentation hooks. Set on a column via `meta` so the headless
 * table can drive the same responsive classes the bespoke markup used.
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  /** Column id to expose a search box for (client-side contains filter). */
  searchColumnId?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  /** When set, rows for which this returns true render an expanded panel below. */
  isRowExpanded?: (row: TData) => boolean;
  renderExpandedRow?: (row: TData) => ReactNode;
  rowClassName?: (row: TData, isExpanded: boolean) => string;
  emptyState?: ReactNode;
  'data-testid'?: string;
}

export function DataTable<TData>({
  columns,
  data,
  searchColumnId,
  searchPlaceholder,
  pageSize = 10,
  getRowId,
  onRowClick,
  isRowExpanded,
  renderExpandedRow,
  rowClassName,
  emptyState,
  'data-testid': testId,
}: Readonly<DataTableProps<TData>>) {
  const { t } = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!searchColumnId) return true;
      const value = row.getValue(searchColumnId);
      return String(value ?? '')
        .toLowerCase()
        .includes(String(filterValue).toLowerCase());
    },
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const colSpan = table.getVisibleFlatColumns().length;
  const pageCount = table.getPageCount();

  return (
    <div className="space-y-3">
      {searchColumnId && (
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="max-w-xs"
          data-testid={testId ? `${testId}-search` : undefined}
        />
      )}

      <div className="bg-card rounded-lg border overflow-hidden" data-testid={testId}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const headerContent = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  );
                  return (
                    <TableHead
                      key={header.id}
                      className={cn('px-3 sm:px-5', meta?.headerClassName)}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {headerContent}
                          <SortIcon direction={sorted} />
                        </button>
                      ) : (
                        headerContent
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const expanded = isRowExpanded?.(row.original) ?? false;
              return (
                <Fragment key={row.id}>
                  <TableRow
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      rowClassName?.(row.original, expanded),
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn('px-3 sm:px-5', meta?.cellClassName)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {expanded && renderExpandedRow && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={colSpan} className="p-0">
                        {renderExpandedRow(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colSpan} className="py-16 text-center">
                  {emptyState}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {t('table.page')} {table.getState().pagination.pageIndex + 1} / {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              data-testid={testId ? `${testId}-prev` : undefined}
            >
              {t('table.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              data-testid={testId ? `${testId}-next` : undefined}
            >
              {t('table.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortIcon({ direction }: Readonly<{ direction: false | 'asc' | 'desc' }>) {
  if (direction === 'asc') return <ArrowUp className="h-3 w-3" />;
  if (direction === 'desc') return <ArrowDown className="h-3 w-3" />;
  return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
}
