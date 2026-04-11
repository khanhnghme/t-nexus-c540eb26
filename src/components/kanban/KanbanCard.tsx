import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/UserAvatar';
import { Calendar, ChevronDown, Users } from 'lucide-react';
import { formatDeadlineShortVN, isDeadlineOverdue } from '@/lib/datetime';
import type { KanbanTask } from '@/hooks/useKanbanBoard';
import type { TaskStatus } from '@/types/database';

interface KanbanCardProps {
  task: KanbanTask;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  onClickTask: (taskId: string) => void;
  canEdit: boolean;
}

const STATUS_BORDER_COLOR: Record<TaskStatus, string> = {
  TODO: 'border-l-muted-foreground',
  IN_PROGRESS: 'border-l-warning',
  DONE: 'border-l-primary',
  VERIFIED: 'border-l-success',
};

export default function KanbanCard({ task, onMoveTask, onClickTask, canEdit }: KanbanCardProps) {
  const { translations: t } = useLanguage();
  const effectiveDeadline = task.extended_deadline || task.deadline;
  const overdue = isDeadlineOverdue(effectiveDeadline) && task.status !== 'DONE' && task.status !== 'VERIFIED';

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'TODO', label: t.kanban?.todo ?? 'Chờ làm' },
    { value: 'IN_PROGRESS', label: t.kanban?.inProgress ?? 'Đang làm' },
    { value: 'DONE', label: t.kanban?.done ?? 'Hoàn thành' },
    { value: 'VERIFIED', label: t.kanban?.verified ?? 'Đã duyệt' },
  ];

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${STATUS_BORDER_COLOR[task.status]} ${task.is_hidden ? 'opacity-50' : ''}`}
      onClick={() => onClickTask(task.id)}
    >
      <CardContent className="p-3 space-y-2">
        <h4 className="text-sm font-medium leading-tight line-clamp-2">{task.title}</h4>

        {task.stage_name && (
          <Badge variant="outline" className="text-[10px] h-5">
            {task.stage_name}
          </Badge>
        )}

        {effectiveDeadline && (
          <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            <Calendar className="w-3 h-3" />
            <span>{overdue ? (t.kanban?.overdue ?? 'Quá hạn: ') : ''}{formatDeadlineShortVN(effectiveDeadline)}</span>
          </div>
        )}

        {task.assignees.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-muted-foreground" />
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map(a => (
                <UserAvatar
                  key={a.user_id}
                  src={a.avatar_url}
                  name={a.full_name}
                  size="xs"
                  className="border border-background"
                />
              ))}
              {task.assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] border border-background">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 text-xs w-full justify-between px-2">
                {t.kanban?.moveStatus ?? 'Chuyển trạng thái'}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={e => e.stopPropagation()}>
              {statusOptions.filter(s => s.value !== task.status).map(s => (
                <DropdownMenuItem key={s.value} onClick={() => onMoveTask(task.id, s.value)}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}
