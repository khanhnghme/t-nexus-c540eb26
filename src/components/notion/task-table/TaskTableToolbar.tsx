import { X, Filter } from 'lucide-react';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STATUS_CONFIG } from './taskTableColumns';
import { applyStatusFilter, applyStageFilter } from './useTaskTableFilters';
import type { TaskTableRow } from './useTaskTableData';

interface FilterValues {
  statuses: TaskTableRow['status'][];
  stages: { id: string; name: string }[];
  assignees: { user_id: string; full_name: string }[];
}

interface TaskTableToolbarProps {
  filterValues: FilterValues;
  columnFilters: ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
}

export function TaskTableToolbar({ filterValues, columnFilters, setColumnFilters }: TaskTableToolbarProps) {
  const activeStatus = columnFilters.find(f => f.id === 'status')?.value as TaskTableRow['status'] | undefined;
  const activeStage = columnFilters.find(f => f.id === 'stage_name')?.value as string | undefined;
  const hasFilters = columnFilters.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />

      {/* Status filters */}
      {filterValues.statuses.map(status => {
        const config = STATUS_CONFIG[status];
        const isActive = activeStatus === status;
        return (
          <Button
            key={status}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyStatusFilter(setColumnFilters, isActive ? null : status)}
          >
            {config.label}
          </Button>
        );
      })}

      {/* Stage filters */}
      {filterValues.stages.length > 0 && (
        <>
          <span className="mx-1 h-4 w-px bg-border" />
          {filterValues.stages.map(stage => {
            const isActive = activeStage === stage.name;
            return (
              <Button
                key={stage.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
              onClick={() => applyStageFilter(setColumnFilters, isActive ? null : stage.name)}
              >
                {stage.name}
              </Button>
            );
          })}
        </>
      )}

      {/* Clear all */}
      {hasFilters && (
        <>
          <span className="mx-1 h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setColumnFilters([])}>
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        </>
      )}
    </div>
  );
}
