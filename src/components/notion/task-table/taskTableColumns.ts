import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { TaskTableRow } from './useTaskTableData';

const columnHelper = createColumnHelper<TaskTableRow>();

export const STATUS_CONFIG: Record<TaskTableRow['status'], { label: string; color: string }> = {
  TODO: { label: 'To Do', color: 'bg-muted text-muted-foreground' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-primary/10 text-primary' },
  DONE: { label: 'Done', color: 'bg-green-500/10 text-green-600' },
  VERIFIED: { label: 'Verified', color: 'bg-blue-500/10 text-blue-600' },
};

export interface TaskTableTranslations {
  title: string;
  status: string;
  assignees: string;
  deadline: string;
  stage: string;
  submission: string;
  fileAndLink: string;
  fileOnly: string;
  linkOnly: string;
}

export function getTaskTableColumns(t?: TaskTableTranslations) {
  return [
    columnHelper.accessor('title', {
      header: t?.title ?? 'Title',
      cell: info => info.getValue(),
      size: 280,
    }),
    columnHelper.accessor('status', {
      header: t?.status ?? 'Status',
      cell: info => info.getValue(),
      size: 130,
      filterFn: 'equals',
    }),
    columnHelper.accessor('assignees', {
      header: t?.assignees ?? 'Assignees',
      cell: info => info.getValue(),
      size: 160,
      enableSorting: false,
    }),
    columnHelper.accessor('deadline', {
      header: t?.deadline ?? 'Deadline',
      cell: info => {
        const val = info.getValue();
        return val ? format(new Date(val), 'MMM d, yyyy') : '—';
      },
      size: 140,
      sortingFn: 'datetime',
    }),
    columnHelper.accessor('stage_name', {
      header: t?.stage ?? 'Stage',
      cell: info => info.getValue() || '—',
      size: 140,
    }),
    columnHelper.accessor('submission_method', {
      header: t?.submission ?? 'Submission',
      cell: info => {
        const map: Record<string, string> = {
          both: t?.fileAndLink ?? 'File & Link',
          file_only: t?.fileOnly ?? 'File',
          link_only: t?.linkOnly ?? 'Link',
        };
        return map[info.getValue()] || info.getValue();
      },
      size: 120,
    }),
  ];
}
