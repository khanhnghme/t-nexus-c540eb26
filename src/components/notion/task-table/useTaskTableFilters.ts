import { useMemo } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';
import type { TaskTableRow } from './useTaskTableData';

interface UniqueFilterValues {
  statuses: TaskTableRow['status'][];
  stages: { id: string; name: string }[];
  assignees: { user_id: string; full_name: string }[];
}

export function getUniqueFilterValues(data: TaskTableRow[]): UniqueFilterValues {
  const statusSet = new Set<TaskTableRow['status']>();
  const stageMap = new Map<string, string>();
  const assigneeMap = new Map<string, string>();

  for (const row of data) {
    statusSet.add(row.status);
    if (row.stage_id && row.stage_name) {
      stageMap.set(row.stage_id, row.stage_name);
    }
    for (const a of row.assignees) {
      assigneeMap.set(a.user_id, a.full_name);
    }
  }

  return {
    statuses: Array.from(statusSet),
    stages: Array.from(stageMap, ([id, name]) => ({ id, name })),
    assignees: Array.from(assigneeMap, ([user_id, full_name]) => ({ user_id, full_name })),
  };
}

export function useTaskTableFilters(data: TaskTableRow[]) {
  const filterValues = useMemo(() => getUniqueFilterValues(data), [data]);
  return filterValues;
}

export function applyStatusFilter(
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>,
  status: TaskTableRow['status'] | null,
) {
  setColumnFilters(prev => {
    const without = prev.filter(f => f.id !== 'status');
    return status ? [...without, { id: 'status', value: status }] : without;
  });
}

export function applyStageFilter(
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>,
  stageName: string | null,
) {
  setColumnFilters(prev => {
    const without = prev.filter(f => f.id !== 'stage_name');
    return stageName ? [...without, { id: 'stage_name', value: stageName }] : without;
  });
}
