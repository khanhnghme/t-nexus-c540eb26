import { useKanbanBoard } from '@/hooks/useKanbanBoard';
import KanbanColumn from './KanbanColumn';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskStatus } from '@/types/database';

interface KanbanBoardViewProps {
  groupId: string;
  canEdit: boolean;
  onClickTask: (taskId: string) => void;
}

const COLUMN_LABELS: Record<TaskStatus, string> = {
  TODO: 'Chờ làm',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Hoàn thành',
  VERIFIED: 'Đã duyệt',
};

export default function KanbanBoardView({ groupId, canEdit, onClickTask }: KanbanBoardViewProps) {
  const { columns, getColumnTasks, moveTask, isLoading } = useKanbanBoard(groupId);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="min-w-[280px] w-[280px] space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          label={COLUMN_LABELS[status]}
          tasks={getColumnTasks(status)}
          onMoveTask={moveTask}
          onClickTask={onClickTask}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}
