import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import KanbanCard from './KanbanCard';
import type { KanbanTask } from '@/hooks/useKanbanBoard';
import type { TaskStatus } from '@/types/database';

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: KanbanTask[];
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  onClickTask: (taskId: string) => void;
  canEdit: boolean;
}

const STATUS_HEADER_COLOR: Record<TaskStatus, string> = {
  TODO: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  DONE: 'bg-primary/10 text-primary',
  VERIFIED: 'bg-success/10 text-success',
};

export default function KanbanColumn({ status, label, tasks, onMoveTask, onClickTask, canEdit }: KanbanColumnProps) {
  const { translations: t } = useLanguage();

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] bg-muted/30 rounded-lg border">
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <Badge className={`${STATUS_HEADER_COLOR[status]} text-xs`}>{label}</Badge>
          <span className="text-xs text-muted-foreground font-medium">{tasks.length}</span>
        </div>
      </div>
      <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
        <div className="p-2 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">{t.kanban?.noTasks ?? 'Không có task nào'}</p>
          ) : (
            tasks.map(task => (
              <KanbanCard
                key={task.id}
                task={task}
                onMoveTask={onMoveTask}
                onClickTask={onClickTask}
                canEdit={canEdit}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
