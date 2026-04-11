import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TaskTableRow } from './useTaskTableData';

interface TaskTablePaginationProps {
  table: Table<TaskTableRow>;
  totalRows: number;
}

export function TaskTablePagination({ table, totalRows }: TaskTablePaginationProps) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const filteredTotal = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, filteredTotal);

  if (filteredTotal === 0) return null;

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        Showing {start}–{end} of {filteredTotal}
        {filteredTotal !== totalRows && ` (filtered from ${totalRows})`}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
