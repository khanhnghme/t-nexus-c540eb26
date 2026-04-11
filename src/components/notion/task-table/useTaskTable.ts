import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useTaskTableData } from './useTaskTableData';
import { getTaskTableColumns, type TaskTableTranslations } from './taskTableColumns';
import { useIsMobile } from '@/hooks/use-mobile';

export function useTaskTable(groupId: string | undefined, translations?: TaskTableTranslations) {
  const { data = [], isLoading, error } = useTaskTableData(groupId);
  const columns = useMemo(() => getTaskTableColumns(translations), [translations]);
  const isMobile = useIsMobile();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const columnVisibility: VisibilityState = useMemo(() => {
    if (!isMobile) return {};
    return {
      stage_name: false,
      submission_method: false,
    };
  }, [isMobile]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, pagination, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return {
    table,
    isLoading,
    error,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    pagination,
    setPagination,
    totalRows: data.length,
  };
}
