import { flexRender } from '@tanstack/react-table';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import UserAvatar from '@/components/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTaskTable } from './useTaskTable';
import { useTaskTableFilters } from './useTaskTableFilters';
import { STATUS_CONFIG } from './taskTableColumns';
import { TaskTableToolbar } from './TaskTableToolbar';
import { TaskTablePagination } from './TaskTablePagination';
import type { TaskTableRow } from './useTaskTableData';

interface TaskTableProps {
  groupId: string | undefined;
}

function StatusBadge({ status }: { status: TaskTableRow['status'] }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`${config.color} border-0 text-xs font-medium`}>
      {config.label}
    </Badge>
  );
}

function AssigneeStack({ assignees }: { assignees: TaskTableRow['assignees'] }) {
  if (!assignees.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center -space-x-1.5">
      {assignees.slice(0, 3).map(a => (
        <UserAvatar key={a.user_id} src={a.avatar_url} name={a.full_name} size="xs" />
      ))}
      {assignees.length > 3 && (
        <span className="ml-1.5 text-xs text-muted-foreground">+{assignees.length - 3}</span>
      )}
    </div>
  );
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
  if (sorted === 'desc') return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-0 group-hover:opacity-50" />;
}

function renderCell(columnId: string, value: unknown) {
  if (columnId === 'status') return <StatusBadge status={value as TaskTableRow['status']} />;
  if (columnId === 'assignees') return <AssigneeStack assignees={value as TaskTableRow['assignees']} />;
  return value as React.ReactNode;
}

export function TaskTable({ groupId }: TaskTableProps) {
  const { translations: { taskTable: tt } } = useLanguage();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const translations = {
    title: tt.title,
    status: tt.status,
    assignees: tt.assignees,
    deadline: tt.deadline,
    stage: tt.stage,
    submission: tt.submission,
    fileAndLink: tt.fileAndLink,
    fileOnly: tt.fileOnly,
    linkOnly: tt.linkOnly,
  };

  const { table, isLoading, error, columnFilters, setColumnFilters, totalRows } = useTaskTable(groupId, translations);
  const data = table.options.data as TaskTableRow[];
  const filterValues = useTaskTableFilters(data);

  const handleRowClick = (row: TaskTableRow) => {
    if (slug) {
      navigate(`/p/${slug}/t/${row.short_id || row.id}`);
    }
  };

  if (error) {
    return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{tt.loadError}</div>;
  }

  return (
    <div className="space-y-2">
      <TaskTableToolbar
        filterValues={filterValues}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
      />

      <div className="rounded-lg border border-border/60 bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-b border-border/60 hover:bg-transparent">
                {hg.headers.map(header => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={canSort ? 'group cursor-pointer select-none' : ''}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon sorted={header.column.getIsSorted()} />}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {table.getAllColumns().filter(c => c.getIsVisible()).map(col => (
                    <TableCell key={col.id}><Skeleton className="h-4 w-3/4" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center text-muted-foreground">
                  {tt.noTasks}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {renderCell(cell.column.id, cell.getValue())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TaskTablePagination table={table} totalRows={totalRows} />
    </div>
  );
}
