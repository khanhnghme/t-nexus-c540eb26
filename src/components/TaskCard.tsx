import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { Progress } from '@/components/ui/progress';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, CheckCircle2, AlertTriangle, Clock, CalendarPlus } from 'lucide-react';
import type { Task, TaskAssignment, Profile } from '@/types/database';
import { isDeadlineOverdue, parseLocalDateTime } from '@/lib/datetime';
import { getProjectUrl, getTaskUrl } from '@/lib/urlUtils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ResourceLinkRenderer from '@/components/ResourceLinkRenderer';

interface TaskCardProps {
  task: Task & { task_assignments?: (TaskAssignment & { profiles?: Profile })[]; extended_deadline?: string };
  groupId: string;
  groupSlug?: string;
  showLink?: boolean;
}

export function TaskCard({ task, groupId, groupSlug, showLink = true }: TaskCardProps) {
  // Handle extended deadline
  const hasExtension = !!(task as any).extended_deadline;
  const effectiveDeadline = hasExtension ? (task as any).extended_deadline : task.deadline;
  const isOverdue = isDeadlineOverdue(effectiveDeadline);
  const taskIsOverdue = isOverdue && task.status !== 'DONE' && task.status !== 'VERIFIED';

  // Calculate extension hours for display
  const getExtensionText = () => {
    if (!task.deadline || !hasExtension) return '';
    const original = parseLocalDateTime(task.deadline);
    const extended = parseLocalDateTime((task as any).extended_deadline);
    if (!original || !extended) return '';
    const diffMs = extended.getTime() - original.getTime();
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours <= 0) return '';
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    let text = '+';
    if (days > 0) text += `${days}d`;
    if (days > 0 && remainingHours > 0) text += ' ';
    if (remainingHours > 0) text += `${remainingHours}h`;
    return text;
  };

  const getStatusConfig = (status: string) => {
    if (taskIsOverdue) {
      return { label: 'Trễ deadline', color: 'bg-destructive/10 text-destructive border-destructive/30', progress: 0, icon: AlertTriangle };
    }
    switch (status) {
      case 'TODO':
        return { label: 'Chờ làm', color: 'bg-muted text-muted-foreground', progress: 0, icon: Clock };
      case 'IN_PROGRESS':
        return { label: 'Đang làm', color: 'bg-warning/10 text-warning border-warning/30', progress: 50, icon: Clock };
      case 'DONE':
        return { label: 'Hoàn thành', color: 'bg-primary/10 text-primary border-primary/30', progress: 80, icon: CheckCircle2 };
      case 'VERIFIED':
        return { label: 'Đã duyệt', color: 'bg-success/10 text-success border-success/30', progress: 100, icon: CheckCircle2 };
      default:
        return { label: status, color: 'bg-muted', progress: 0, icon: Clock };
    }
  };

  const statusConfig = getStatusConfig(task.status);
  const StatusIcon = statusConfig.icon;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const content = (
    <Card className={`group hover:shadow-card-lg transition-all duration-200 border-border/50 hover:border-primary/20 ${
      taskIsOverdue ? 'border-destructive/30 bg-destructive/5' : ''
    }`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {task.title}
                </h3>
                {taskIsOverdue && (
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                )}
              </div>
              {task.description && (
                <div className="text-sm text-muted-foreground line-clamp-2">
                  <ResourceLinkRenderer content={task.description} />
                </div>
              )}
            </div>
            <Badge className={`${statusConfig.color} shrink-0 border gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={statusConfig.progress} className="h-1.5" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {/* Extension Badge - Prominent display */}
              {hasExtension && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="gap-0.5 px-1.5 py-0 text-[10px] bg-blue-500/15 text-blue-600 border-blue-500/30 cursor-default">
                        <CalendarPlus className="w-3 h-3" />
                        {getExtensionText()}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground">Deadline gốc: {task.deadline ? format(parseLocalDateTime(task.deadline)!, "dd/MM - HH:mm", { locale: vi }) : '-'}</p>
                        <p className="font-medium text-blue-600">Gia hạn đến: {effectiveDeadline ? format(parseLocalDateTime(effectiveDeadline)!, "dd/MM - HH:mm", { locale: vi }) : '-'}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Deadline Countdown - Use effective deadline */}
              {effectiveDeadline && (
                <CountdownTimer deadline={effectiveDeadline} className="text-xs" />
              )}
              
              {/* Submission indicator */}
              {task.submission_link && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã nộp</span>
                </div>
              )}
            </div>

            {/* Assignees */}
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {task.task_assignments?.slice(0, 3).map((assignment) => (
                  <UserAvatar 
                    key={assignment.id}
                    src={assignment.profiles?.avatar_url}
                    name={assignment.profiles?.full_name}
                    size="sm"
                    className="border-2 border-background"
                  />
                ))}
              </div>
              {(task.task_assignments?.length || 0) > 3 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{(task.task_assignments?.length || 0) - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (showLink) {
    // Use semantic URL with slugs if available
    const projectPath = groupSlug ? `/p/${groupSlug}` : `/groups/${groupId}`;
    const taskPath = task.slug ? `${projectPath}/t/${task.slug}` : `${projectPath}?tab=tasks&task=${task.id}`;
    
    return (
      <Link to={taskPath} className="block">
        {content}
      </Link>
    );
  }

  return content;
}