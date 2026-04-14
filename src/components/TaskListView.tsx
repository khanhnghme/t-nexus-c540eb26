import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteWithUndo } from '@/lib/deleteWithUndo';
import { deleteTaskFiles } from '@/lib/storageCleanup';
import { logActivity } from '@/lib/activityLogger';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  MoreVertical,
  Calendar,
  CalendarPlus,
  Trash2,
  Edit,
  Loader2,
  Layers,
  ChevronDown,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  History,
  Clock,
  Target,
  
  Users,
  Eye,
  EyeOff,
  Award,
  CheckSquare,
  X,
  Video,
  Sparkles,
  FolderCheck,
  GripVertical,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, Stage, GroupMember } from '@/types/database';
import { formatDeadlineVN, isDeadlineOverdue, parseLocalDateTime } from '@/lib/datetime';
import TaskSubmissionDialog from './TaskSubmissionDialog';
import SubmissionHistoryPopup from './SubmissionHistoryPopup';
import SubmissionButton from './SubmissionButton';
import TaskScoringDialog from './scores/TaskScoringDialog';
import TaskFilters, { TaskFilters as TaskFiltersType, defaultTaskFilters } from './TaskFilters';
import type { TaskScore } from '@/types/processScores';

// Stage color helper - returns a consistent color for each stage index
const getStageColor = (index: number) => {
  const colors = [
    { bg: 'bg-stage-1/10', text: 'text-stage-1', border: 'border-stage-1/30', dot: 'bg-stage-1', accent: 'bg-stage-1/20' },
    { bg: 'bg-stage-2/10', text: 'text-stage-2', border: 'border-stage-2/30', dot: 'bg-stage-2', accent: 'bg-stage-2/20' },
    { bg: 'bg-stage-3/10', text: 'text-stage-3', border: 'border-stage-3/30', dot: 'bg-stage-3', accent: 'bg-stage-3/20' },
    { bg: 'bg-stage-4/10', text: 'text-stage-4', border: 'border-stage-4/30', dot: 'bg-stage-4', accent: 'bg-stage-4/20' },
    { bg: 'bg-stage-5/10', text: 'text-stage-5', border: 'border-stage-5/30', dot: 'bg-stage-5', accent: 'bg-stage-5/20' },
    { bg: 'bg-stage-6/10', text: 'text-stage-6', border: 'border-stage-6/30', dot: 'bg-stage-6', accent: 'bg-stage-6/20' },
  ];
  return colors[index % colors.length];
};

// Helper functions
const getStatusColor = (status: string, isOverdue: boolean) => {
  if (isOverdue && status !== 'DONE' && status !== 'VERIFIED') {
    return 'bg-transparent text-destructive border-destructive';
  }
  switch (status) {
    case 'TODO':
      return 'bg-muted text-muted-foreground border-muted';
    case 'IN_PROGRESS':
      return 'bg-transparent text-warning border-warning';
    case 'DONE':
      return 'bg-transparent text-primary border-primary';
    case 'VERIFIED':
      return 'bg-transparent text-success border-success';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStatusLabel = (status: string, isOverdue: boolean) => {
  if (isOverdue && status !== 'DONE' && status !== 'VERIFIED') {
    return 'Trễ';
  }
  switch (status) {
    case 'TODO':
      return 'Chờ';
    case 'IN_PROGRESS':
      return 'Đang làm';
    case 'DONE':
      return 'Xong';
    case 'VERIFIED':
      return 'Duyệt';
    default:
      return status;
  }
};

const getProgressPercent = (status: string) => {
  switch (status) {
    case 'TODO':
      return 0;
    case 'IN_PROGRESS':
      return 50;
    case 'DONE':
    case 'VERIFIED':
      return 100;
    default:
      return 0;
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatDate = (dateStr: string) => {
  return formatDeadlineVN(dateStr);
};

// Get main assignee name (first assignee)
const getMainAssignee = (task: Task) => {
  if (!task.task_assignments || task.task_assignments.length === 0) return null;
  return task.task_assignments[0].profiles?.full_name || null;
};

// Calculate task code: [stage_order].[task_index_in_displayed_list]
// taskIndexInStage is the 0-based index of the task in the currently displayed order
const getTaskCode = (task: Task, stages: Stage[], stageIndex: number, taskIndexInStage: number) => {
  if (!task.stage_id) return null;
  return `${stageIndex + 1}.${taskIndexInStage + 1}`;
};

const isOverdue = (deadline: string | null) => isDeadlineOverdue(deadline);

// Extended Task type with is_hidden field
type ExtendedTask = Task & { is_hidden?: boolean };
type ExtendedStage = Stage & { is_hidden?: boolean };

// Horizontal TaskRow component with CSS Grid layout
interface TaskRowProps {
  task: ExtendedTask;
  taskCode: string | null;
  stageColor: ReturnType<typeof getStageColor>;
  isLeaderInGroup: boolean;
  isAssignee: boolean;
  groupId: string;
  groupSlug?: string;
  onEditTask: (task: Task) => void;
  openSubmissionDialog: (task: Task) => void;
  openDetailDialog: (task: Task) => void;
  setTaskToDelete: (task: Task) => void;
  onScoreTask?: (task: Task) => void;
  onToggleHidden?: (task: Task) => void;
  onQuickStatusChange?: (task: Task, newStatus: string) => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  meeting?: any;
  onJoinMeeting?: (meetingId: string) => void;
  dragHandleProps?: any;
  isExpandedMobile?: boolean;
  onToggleMobileExpand?: (taskId: string) => void;
}

function TaskRow({
  task,
  taskCode,
  stageColor,
  isLeaderInGroup,
  isAssignee,
  groupId,
  groupSlug,
  onEditTask,
  openSubmissionDialog,
  openDetailDialog,
  setTaskToDelete,
  onScoreTask,
  onToggleHidden,
  onQuickStatusChange,
  isMultiSelectMode,
  isSelected,
  onToggleSelect,
  meeting,
  onJoinMeeting,
  dragHandleProps,
  isExpandedMobile,
  onToggleMobileExpand,
}: TaskRowProps) {
  // Handle extended deadline
  const taskWithExtended = task as Task & { extended_deadline?: string };
  const hasExtension = !!taskWithExtended.extended_deadline;
  const effectiveDeadline = hasExtension ? taskWithExtended.extended_deadline : task.deadline;
  
  const overdueStatus = isOverdue(effectiveDeadline);
  const taskIsOverdue = overdueStatus && task.status !== 'DONE' && task.status !== 'VERIFIED';
  const canSubmit = isAssignee || isLeaderInGroup;
  const assignments = task.task_assignments || [];
  const hasMultipleAssignees = assignments.length > 1;
  const isMeetingTask = !!meeting;
  const meetingIsLive = meeting?.status === 'in_progress';
  const meetingIsScheduled = meeting?.status === 'scheduled';
  const meetingIsCompleted = meeting?.status === 'completed';

  // Calculate extension text for display
  const getExtensionText = () => {
    if (!task.deadline || !hasExtension) return '';
    const original = parseLocalDateTime(task.deadline);
    const extended = parseLocalDateTime(taskWithExtended.extended_deadline!);
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

  // Handle row click for drill-down
  // Leader or Assignee → open submission/edit popup
  // Non-assignee (not leader) → open view-only popup
  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const rowEl = e.currentTarget as HTMLElement;

    // Don't trigger if clicking on interactive elements inside the row
    if (target.closest('button, a, input, textarea, select, [data-no-drill]')) {
      return;
    }

    const roleButtonEl = target.closest('[role="button"]') as HTMLElement | null;
    if (roleButtonEl && roleButtonEl !== rowEl) {
      return;
    }

    // In multi-select mode, toggle selection instead of opening dialog
    if (isMultiSelectMode && onToggleSelect) {
      onToggleSelect(task.id);
      return;
    }

    // On mobile, toggle expand instead of opening dialog
    if (onToggleMobileExpand && window.innerWidth < 640) {
      onToggleMobileExpand(task.id);
      return;
    }

    if (isLeaderInGroup || isAssignee) {
      openSubmissionDialog(task);
    } else {
      openDetailDialog(task);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Main row */}
      <div 
        className={`group flex items-center gap-x-3 p-3 rounded-lg border bg-card transition-all cursor-pointer
          hover:bg-muted/50 hover:shadow-sm
          ${taskIsOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border'}
          ${task.is_hidden ? 'opacity-50 border-dashed bg-muted/20' : ''}
          ${isSelected ? 'ring-1 ring-primary/60' : ''}
          ${isExpandedMobile ? 'sm:rounded-lg rounded-b-none border-b-0 sm:border-b' : ''}`}
        onClick={handleRowClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isMultiSelectMode && onToggleSelect) {
              onToggleSelect(task.id);
            } else if (onToggleMobileExpand && window.innerWidth < 640) {
              onToggleMobileExpand(task.id);
            } else if (isLeaderInGroup || isAssignee) {
              openSubmissionDialog(task);
            } else {
              openDetailDialog(task);
            }
          }
        }}
      >
        {/* Multi-select checkbox */}
        {isMultiSelectMode && (
          <div className="shrink-0" data-no-drill>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(task.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
            />
          </div>
        )}

        {/* Drag handle */}
        {isLeaderInGroup && !isMultiSelectMode && dragHandleProps && (
          <div {...dragHandleProps} className="shrink-0 cursor-grab active:cursor-grabbing" data-no-drill>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {/* Task code badge */}
        {taskCode && (
          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
            {taskCode}
          </span>
        )}

        {/* Main content: title + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isMeetingTask && <Video className="w-3.5 h-3.5 text-primary shrink-0" />}
            {taskIsOverdue && !isMeetingTask && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{task.title}</p>
            {task.is_hidden && <EyeOff className="w-3 h-3 text-muted-foreground shrink-0" />}
            {/* Meeting badges */}
            {meetingIsLive && (
              <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] px-1.5 py-0 shrink-0 animate-pulse gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
                </span>
                LIVE
              </Badge>
            )}
            {meetingIsScheduled && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">Sắp họp</Badge>}
            {meetingIsCompleted && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Đã họp</Badge>}
          </div>
          {/* Desktop subtitle */}
          <div className="hidden sm:flex items-center gap-2 mt-0.5">
            {assignments.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {hasMultipleAssignees 
                  ? `${assignments.length} thành viên` 
                  : assignments[0]?.profiles?.full_name || 'Unknown'}
              </span>
            )}
            {hasExtension && (
              <Badge className="gap-0.5 px-1 py-0 text-[9px] bg-blue-500/15 text-blue-600 border-blue-500/30 shrink-0">
                <CalendarPlus className="w-2.5 h-2.5" />
                {getExtensionText()}
              </Badge>
            )}
          </div>
        </div>

        {/* Mobile: status badge + chevron indicator */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          <Badge 
            className={`${getStatusColor(task.status, taskIsOverdue)} text-[10px] px-1.5 py-0.5 border whitespace-nowrap w-[52px] justify-center`}
          >
            {getStatusLabel(task.status, taskIsOverdue)}
          </Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpandedMobile ? 'rotate-180' : ''}`} />
        </div>

        {/* Desktop: deadline + status + actions (hidden on mobile) */}
        {effectiveDeadline && (
          <span className={`hidden sm:flex text-[11px] items-center gap-0.5 shrink-0 whitespace-nowrap ${
            taskIsOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
          }`}>
            <Calendar className="w-3 h-3" />
            {formatDate(effectiveDeadline)}
          </span>
        )}

        {/* Status badge desktop */}
        <div className="hidden sm:block">
          {isLeaderInGroup && onQuickStatusChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`${getStatusColor(task.status, taskIsOverdue)} text-[10px] px-1.5 py-0.5 border whitespace-nowrap shrink-0 w-[60px] justify-center inline-flex items-center gap-0.5 rounded-md font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={(e) => e.stopPropagation()}
                  data-no-drill
                >
                  {getStatusLabel(task.status, taskIsOverdue)}
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="z-50 bg-popover min-w-[130px]" onClick={(e) => e.stopPropagation()}>
                {[
                  { value: 'TODO', label: 'Chờ làm', icon: Clock, color: 'text-muted-foreground' },
                  { value: 'IN_PROGRESS', label: 'Đang làm', icon: Clock, color: 'text-warning' },
                  { value: 'DONE', label: 'Hoàn thành', icon: CheckCircle2, color: 'text-primary' },
                  { value: 'VERIFIED', label: 'Đã duyệt', icon: Award, color: 'text-success' },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isCurrent = task.status === opt.value;
                  return (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCurrent) onQuickStatusChange(task, opt.value);
                      }}
                      className={`text-xs gap-2 ${isCurrent ? 'font-semibold bg-muted' : ''}`}
                      disabled={isCurrent}
                    >
                      <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
                      {opt.label}
                      {isCurrent && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge 
              className={`${getStatusColor(task.status, taskIsOverdue)} text-[10px] px-1.5 py-0.5 border whitespace-nowrap shrink-0 w-[52px] justify-center`}
            >
              {getStatusLabel(task.status, taskIsOverdue)}
            </Badge>
          )}
        </div>

        {/* Action buttons desktop */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 w-[180px] justify-end">
          {isMeetingTask ? (
            onJoinMeeting && (
              <Button
                size="sm"
                variant={meetingIsLive ? "default" : meetingIsCompleted ? "secondary" : "outline"}
                className={`h-7 text-xs px-2 gap-1 ${meetingIsLive ? 'animate-pulse' : ''}`}
                onClick={(e) => { e.stopPropagation(); onJoinMeeting(meeting.id); }}
              >
                <Video className="w-3 h-3" />
                {meetingIsLive ? 'Vào họp' : meetingIsCompleted ? 'Xem lại' : 'Phòng họp'}
              </Button>
            )
          ) : (
            <>
              <SubmissionHistoryPopup 
                taskId={task.id}
                groupId={groupId}
                taskDeadline={(task as any).extended_deadline || task.deadline}
                currentSubmissionLink={task.submission_link}
                projectSlug={groupSlug}
                taskSlug={task.slug}
              />
              <SubmissionButton 
                submissionLink={task.submission_link} 
                variant="compact"
                onStopPropagation={true}
                taskId={task.id}
                groupId={groupId}
                projectSlug={groupSlug}
                taskSlug={task.slug}
              />
              {canSubmit ? (
                <Button
                  variant={task.submission_link ? "outline" : "default"}
                  size="sm"
                  className="h-7 text-xs px-2 gap-1"
                  onClick={(e) => { e.stopPropagation(); openSubmissionDialog(task); }}
                >
                  {task.submission_link ? <><Edit className="w-3 h-3" /><span className="hidden lg:inline">Sửa</span></> : <><Send className="w-3 h-3" /><span className="hidden lg:inline">Nộp</span></>}
                </Button>
              ) : (
                <div className="w-[52px]" />
              )}
            </>
          )}
        </div>

        {/* Menu - desktop only */}
        {isLeaderInGroup && (
          <div className="hidden sm:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 bg-popover min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }} className="text-xs">
                  <Edit className="w-3.5 h-3.5 mr-2" />Chỉnh sửa
                </DropdownMenuItem>
                {onScoreTask && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onScoreTask(task); }} className="text-xs">
                    <Award className="w-3.5 h-3.5 mr-2" />Chấm điểm
                  </DropdownMenuItem>
                )}
                {onToggleHidden && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleHidden(task); }} className="text-xs">
                    {task.is_hidden ? <><Eye className="w-3.5 h-3.5 mr-2" />Hiện task</> : <><EyeOff className="w-3.5 h-3.5 mr-2" />Ẩn task</>}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }} className="text-destructive text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-2" />Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Drill-down arrow - desktop only */}
        <ChevronRight className="hidden sm:block w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      {/* Mobile expandable panel */}
      {isExpandedMobile && (
        <div className="sm:hidden border border-t-0 border-border rounded-b-lg bg-muted/30 px-3 py-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
          {/* Deadline */}
          {effectiveDeadline && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`text-xs ${taskIsOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {formatDate(effectiveDeadline)}
              </span>
              {hasExtension && (
                <Badge className="gap-0.5 px-1 py-0 text-[9px] bg-blue-500/15 text-blue-600 border-blue-500/30">
                  <CalendarPlus className="w-2.5 h-2.5" />
                  {getExtensionText()}
                </Badge>
              )}
            </div>
          )}

          {/* Assignees */}
          {assignments.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {assignments.map((a: any) => (
                  <div key={a.user_id} className="flex items-center gap-1">
                    <UserAvatar
                      src={a.profiles?.avatar_url}
                      name={a.profiles?.full_name || '?'}
                      size="xs"
                    />
                    <span className="text-xs text-muted-foreground">{a.profiles?.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status change (leader) */}
          {isLeaderInGroup && onQuickStatusChange && (
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="flex items-center gap-1">
                {[
                  { value: 'TODO', label: 'Chờ', color: 'text-muted-foreground' },
                  { value: 'IN_PROGRESS', label: 'Làm', color: 'text-warning' },
                  { value: 'DONE', label: 'Xong', color: 'text-primary' },
                  { value: 'VERIFIED', label: 'Duyệt', color: 'text-success' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={(e) => { e.stopPropagation(); if (task.status !== opt.value) onQuickStatusChange(task, opt.value); }}
                    className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                      task.status === opt.value 
                        ? `${getStatusColor(task.status, taskIsOverdue)} font-semibold` 
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            {isMeetingTask && onJoinMeeting ? (
              <Button size="sm" variant={meetingIsLive ? "default" : "outline"} className="h-8 text-xs gap-1 flex-1" onClick={(e) => { e.stopPropagation(); onJoinMeeting(meeting.id); }}>
                <Video className="w-3.5 h-3.5" />
                {meetingIsLive ? 'Vào họp' : 'Phòng họp'}
              </Button>
            ) : (
              <>
                {canSubmit && (
                  <Button
                    variant={task.submission_link ? "outline" : "default"}
                    size="sm"
                    className="h-8 text-xs gap-1 flex-1"
                    onClick={(e) => { e.stopPropagation(); openSubmissionDialog(task); }}
                  >
                    {task.submission_link ? <><Edit className="w-3.5 h-3.5" />Sửa bài</> : <><Send className="w-3.5 h-3.5" />Nộp bài</>}
                  </Button>
                )}
                <SubmissionHistoryPopup 
                  taskId={task.id}
                  groupId={groupId}
                  taskDeadline={(task as any).extended_deadline || task.deadline}
                  currentSubmissionLink={task.submission_link}
                  projectSlug={groupSlug}
                  taskSlug={task.slug}
                />
                <SubmissionButton 
                  submissionLink={task.submission_link} 
                  variant="compact"
                  onStopPropagation={true}
                  taskId={task.id}
                  groupId={groupId}
                  projectSlug={groupSlug}
                  taskSlug={task.slug}
                />
              </>
            )}

            {/* Leader actions on mobile */}
            {isLeaderInGroup && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-popover min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }} className="text-xs">
                    <Edit className="w-3.5 h-3.5 mr-2" />Chỉnh sửa
                  </DropdownMenuItem>
                  {onScoreTask && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onScoreTask(task); }} className="text-xs">
                      <Award className="w-3.5 h-3.5 mr-2" />Chấm điểm
                    </DropdownMenuItem>
                  )}
                  {onToggleHidden && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleHidden(task); }} className="text-xs">
                      {task.is_hidden ? <><Eye className="w-3.5 h-3.5 mr-2" />Hiện task</> : <><EyeOff className="w-3.5 h-3.5 mr-2" />Ẩn task</>}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }} className="text-destructive text-xs">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />Xóa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Open detail button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                if (isLeaderInGroup || isAssignee) {
                  openSubmissionDialog(task);
                } else {
                  openDetailDialog(task);
                }
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
interface TaskListViewProps {
  stages: ExtendedStage[];
  tasks: ExtendedTask[];
  members: GroupMember[];
  isLeaderInGroup: boolean;
  groupId: string;
  groupSlug?: string;
  onRefresh: () => void;
  onEditTask: (task: Task) => void;
  onCreateTask: (stageId: string) => void;
  onEditStage: (stage: Stage) => void;
  onDeleteStage: (stage: Stage) => void;
  onToggleStageHidden?: (stage: Stage) => void;
}

export default function TaskListView({
  stages,
  tasks,
  members,
  isLeaderInGroup,
  groupId,
  groupSlug,
  onRefresh,
  onEditTask,
  onCreateTask,
  onEditStage,
  onDeleteStage,
  onToggleStageHidden,
}: TaskListViewProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(stages.map(s => s.id)));
  const [filterStage, setFilterStage] = useState<string>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [taskFilters, setTaskFilters] = useState<TaskFiltersType>(defaultTaskFilters);

  // Auto-collapse completed stages - per user preference in localStorage
  const autoCollapseKey = `autoCollapseCompleted_${user?.id || 'anon'}_${groupId}`;
  const [autoCollapseCompleted, setAutoCollapseCompleted] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(autoCollapseKey);
      return stored === 'true';
    } catch { return false; }
  });

  const toggleAutoCollapse = useCallback(() => {
    setAutoCollapseCompleted(prev => {
      const next = !prev;
      try { localStorage.setItem(autoCollapseKey, String(next)); } catch {}
      return next;
    });
  }, [autoCollapseKey]);

  // Effect: auto-collapse stages that are 100% completed
  useEffect(() => {
    if (!autoCollapseCompleted) return;
    const completedStageIds = stages.filter(stage => {
      const stageTasks = tasks.filter(t => t.stage_id === stage.id && (!t.is_hidden || showHidden || isLeaderInGroup));
      if (stageTasks.length === 0) return false;
      return stageTasks.every(t => t.status === 'DONE' || t.status === 'VERIFIED');
    }).map(s => s.id);
    
    if (completedStageIds.length > 0) {
      setExpandedStages(prev => {
        const next = new Set(prev);
        completedStageIds.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [autoCollapseCompleted, stages, tasks, showHidden, isLeaderInGroup]);
  const [meetingsByTaskId, setMeetingsByTaskId] = useState<Record<string, any>>({});
  
  // Fetch meetings for this group to show on meeting tasks
  useEffect(() => {
    const fetchMeetings = async () => {
      const { data } = await (supabase.from('meetings') as any)
        .select('id, task_id, status, jitsi_room_name')
        .eq('group_id', groupId);
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((m: any) => { if (m.task_id) map[m.task_id] = m; });
        setMeetingsByTaskId(map);
      }
    };
    fetchMeetings();
  }, [groupId, tasks]);

  const handleJoinMeeting = useCallback((meetingId: string) => {
    setSearchParams({ tab: 'meetings', meeting: meetingId });
  }, [setSearchParams]);
  
  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'delete' | 'status' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>('TODO');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Submission dialog state
  const [submissionTask, setSubmissionTask] = useState<Task | null>(null);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  
  // Detail view dialog state (view-only for non-assignees)
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Scoring dialog state
  const [scoringTask, setScoringTask] = useState<Task | null>(null);
  const [isScoringOpen, setIsScoringOpen] = useState(false);
  const [taskScores, setTaskScores] = useState<TaskScore[]>([]);
  
  // Local task order for drag & drop (maps stage_id -> ordered task ids)
  const [localTaskOrder, setLocalTaskOrder] = useState<Record<string, string[]>>({});

  // Mobile accordion expand state
  const [expandedMobileTaskId, setExpandedMobileTaskId] = useState<string | null>(null);
  const toggleMobileExpand = useCallback((taskId: string) => {
    setExpandedMobileTaskId(prev => prev === taskId ? null : taskId);
  }, []);

  // Sync dialog task with latest data when tasks prop updates
  useEffect(() => {
    if (submissionTask) {
      const updated = tasks.find(t => t.id === submissionTask.id);
      if (updated) setSubmissionTask(updated);
    }
    if (detailTask) {
      const updated = tasks.find(t => t.id === detailTask.id);
      if (updated) setDetailTask(updated);
    }
  }, [tasks]);

  // Toggle task hidden status
  const handleToggleTaskHidden = async (task: ExtendedTask) => {
    try {
      const newHiddenStatus = !task.is_hidden;
      const { error } = await supabase
        .from('tasks')
        .update({ is_hidden: newHiddenStatus })
        .eq('id', task.id);
      
      if (error) throw error;
      
      toast({
        title: newHiddenStatus ? 'Đã ẩn task' : 'Đã hiện task',
        description: `Task "${task.title}" ${newHiddenStatus ? 'đã được ẩn' : 'đã được hiện'}`,
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể thay đổi trạng thái task',
        variant: 'destructive',
      });
    }
  };

  // Quick status change for leaders
  const handleQuickStatusChange = useCallback(async (task: Task, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus as any })
        .eq('id', task.id);
      
      if (error) throw error;
      
      const statusLabels: Record<string, string> = { TODO: 'Chờ làm', IN_PROGRESS: 'Đang làm', DONE: 'Hoàn thành', VERIFIED: 'Đã duyệt' };
      toast({
        title: 'Đã đổi trạng thái',
        description: `"${task.title}" → ${statusLabels[newStatus] || newStatus}`,
      });
      
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'UPDATE', actionType: 'task',
          description: `Đổi trạng thái task "${task.title}" thành "${statusLabels[newStatus] || newStatus}"`,
          groupId,
        });
      }
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể đổi trạng thái',
        variant: 'destructive',
      });
    }
  }, [user, profile, groupId, onRefresh, toast]);

  const fetchTaskScores = useCallback(async () => {
    if (!groupId || tasks.length === 0) return;
    
    const taskIds = tasks.map(t => t.id);
    const { data } = await supabase
      .from('task_scores')
      .select('*')
      .in('task_id', taskIds);
    
    setTaskScores((data || []) as unknown as TaskScore[]);
  }, [groupId, tasks]);

  useEffect(() => {
    if (isLeaderInGroup) {
      fetchTaskScores();
    }
  }, [isLeaderInGroup, fetchTaskScores]);

  const openScoringDialog = (task: Task) => {
    setScoringTask(task);
    setIsScoringOpen(true);
  };

  const getTasksByStage = useCallback((stageId: string | null) => {
    const stageTasks = tasks.filter((task) => task.stage_id === stageId);
    
    // If we have a local order for this stage, use it
    const stageKey = stageId || 'unstaged';
    if (localTaskOrder[stageKey]) {
      const orderedIds = localTaskOrder[stageKey];
      return stageTasks.sort((a, b) => {
        const indexA = orderedIds.indexOf(a.id);
        const indexB = orderedIds.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    
    // Default sort by created_at
    return stageTasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [tasks, localTaskOrder]);

  const isUserAssignee = (task: Task) => {
    return task.task_assignments?.some(a => a.user_id === user?.id) || false;
  };

  const toggleStage = (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };
  
  // Handle drag end for reordering within the same stage
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    // Only allow reordering within the same stage
    if (destination.droppableId !== source.droppableId) return;
    if (destination.index === source.index) return;

    const stageKey = source.droppableId;
    const stageId = stageKey === 'unstaged' ? null : stageKey;
    const stageTasks = getTasksByStage(stageId);
    const currentIds = stageTasks.map(t => t.id);

    // Reorder
    const [movedId] = currentIds.splice(source.index, 1);
    currentIds.splice(destination.index, 0, movedId);

    setLocalTaskOrder(prev => ({ ...prev, [stageKey]: currentIds }));

    // Log activity
    try {
      const movedTask = tasks.find(t => t.id === draggableId);
      if (movedTask && user) {
        await logActivity({
          userId: user.id,
          userName: user.email || 'Unknown',
          action: 'REORDER_TASK',
          actionType: 'task',
          description: `Sắp xếp lại task "${movedTask.title}"`,
          groupId: groupId,
          metadata: { task_id: draggableId, new_position: destination.index + 1 }
        });
      }
    } catch (error) {
      console.error('Error logging reorder:', error);
    }
  }, [getTasksByStage, tasks, user, groupId]);

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    const taskRef = taskToDelete;
    setTaskToDelete(null);

    deleteWithUndo({
      description: `Đã xóa task "${taskRef.title}"`,
      onDelete: async () => {
        // Delete R2 files first
        await deleteTaskFiles(taskRef.id);

        // Cascade: delete linked meeting if this is a meeting task
        const meetingLinked = meetingsByTaskId[taskRef.id];
        if (meetingLinked) {
          await (supabase.from('meeting_messages') as any).delete().eq('meeting_id', meetingLinked.id);
          await (supabase.from('meeting_attendance') as any).delete().eq('meeting_id', meetingLinked.id);
          await (supabase.from('meetings') as any).delete().eq('id', meetingLinked.id);
        }

        await supabase.from('task_assignments').delete().eq('task_id', taskRef.id);
        await supabase.from('task_scores').delete().eq('task_id', taskRef.id);
        await supabase.from('submission_history').delete().eq('task_id', taskRef.id);
        const { error } = await supabase.from('tasks').delete().eq('id', taskRef.id);
        if (error) throw error;

        await logActivity({
          userId: user!.id,
          userName: user?.email || 'Unknown',
          action: 'DELETE_TASK',
          actionType: 'task',
          description: `Xóa task "${taskRef.title}"${meetingLinked ? ' (kèm buổi họp)' : ''}`,
          groupId: groupId,
          metadata: { task_id: taskRef.id, task_title: taskRef.title, meeting_deleted: !!meetingLinked }
        });

        onRefresh();
      },
      onUndo: () => {
        onRefresh();
      },
    });
  };

  // Multi-select helpers
  const toggleTaskSelect = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAllVisibleTasks = () => {
    setSelectedTaskIds(new Set(visibleTasks.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedTaskIds(new Set());
    setIsMultiSelectMode(false);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    const idsToDelete = new Set(selectedTaskIds);
    const count = idsToDelete.size;
    clearSelection();
    setBulkAction(null);

    deleteWithUndo({
      description: `Đã xóa ${count} task`,
      onDelete: async () => {
        for (const taskId of idsToDelete) {
          await deleteTaskFiles(taskId);
          await supabase.from('task_assignments').delete().eq('task_id', taskId);
          await supabase.from('task_scores').delete().eq('task_id', taskId);
          await supabase.from('submission_history').delete().eq('task_id', taskId);
          await supabase.from('tasks').delete().eq('id', taskId);
        }
        if (user && profile) {
          const deletedTasks = tasks.filter(t => idsToDelete.has(t.id));
          await logActivity({
            userId: user.id, userName: profile.full_name,
            action: 'BATCH_DELETE_TASKS', actionType: 'task',
            description: `Xóa hàng loạt ${count} task: ${deletedTasks.map(t => t.title).join(', ')}`,
            groupId,
          });
        }
        onRefresh();
      },
      onUndo: () => {
        onRefresh();
      },
    });
  };

  // Bulk status change
  const handleBulkStatusChange = async () => {
    if (selectedTaskIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: bulkStatus as any })
        .in('id', Array.from(selectedTaskIds));
      if (error) throw error;
      const statusLabels: Record<string, string> = { TODO: 'Chờ thực hiện', IN_PROGRESS: 'Đang thực hiện', DONE: 'Hoàn thành', VERIFIED: 'Đã duyệt' };
      toast({ title: 'Thành công', description: `Đã cập nhật trạng thái ${selectedTaskIds.size} task` });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'BATCH_STATUS_CHANGE', actionType: 'task',
          description: `Đổi trạng thái hàng loạt ${selectedTaskIds.size} task thành "${statusLabels[bulkStatus] || bulkStatus}"`,
          groupId,
        });
      }
      clearSelection();
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsBulkProcessing(false);
      setBulkAction(null);
    }
  };

  const openSubmissionDialog = (task: Task) => {
    setSubmissionTask(task);
    setIsSubmissionOpen(true);
  };

  // Open detail dialog (view-only mode for non-assignees)
  const openDetailDialog = (task: Task) => {
    setDetailTask(task);
    setIsDetailOpen(true);
  };

  // Check if user is assignee for detail dialog
  const isDetailAssignee = detailTask ? isUserAssignee(detailTask) : false;

  // Filter stages and tasks based on visibility settings
  const visibleStages = showHidden || isLeaderInGroup 
    ? stages 
    : stages.filter(s => !s.is_hidden);
    
  const filteredStages = filterStage === 'all' 
    ? visibleStages 
    : visibleStages.filter(s => s.id === filterStage);

  // Filter tasks based on visibility (non-leaders don't see hidden tasks)
  const baseVisibleTasks = showHidden || isLeaderInGroup 
    ? tasks 
    : tasks.filter(t => !t.is_hidden);

  // Apply task filters
  const visibleTasks = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    return baseVisibleTasks.filter(task => {
      // Search text filter
      if (taskFilters.searchText) {
        const searchLower = taskFilters.searchText.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const descMatch = task.description?.toLowerCase().includes(searchLower);
        const assigneeMatch = task.task_assignments?.some(a => 
          a.profiles?.full_name?.toLowerCase().includes(searchLower)
        );
        if (!titleMatch && !descMatch && !assigneeMatch) return false;
      }

      // Status filter
      if (taskFilters.status !== 'all') {
        if (taskFilters.status === 'DONE_OR_VERIFIED') {
          if (task.status !== 'DONE' && task.status !== 'VERIFIED') return false;
        } else if (task.status !== taskFilters.status) {
          return false;
        }
      }

      // Assignee filter
      if (taskFilters.assignee !== 'all') {
        if (taskFilters.assignee === 'unassigned') {
          if (task.task_assignments && task.task_assignments.length > 0) return false;
        } else {
          const hasAssignee = task.task_assignments?.some(a => a.user_id === taskFilters.assignee);
          if (!hasAssignee) return false;
        }
      }

      // Deadline filter
      if (taskFilters.hasDeadline !== 'all') {
        if (taskFilters.hasDeadline === 'yes' && !task.deadline) return false;
        if (taskFilters.hasDeadline === 'no' && task.deadline) return false;
        if (taskFilters.hasDeadline === 'today' && task.deadline) {
          const deadline = new Date(task.deadline);
          if (deadline < startOfToday || deadline >= endOfToday) return false;
        }
        if (taskFilters.hasDeadline === 'thisWeek' && task.deadline) {
          const deadline = new Date(task.deadline);
          if (deadline < startOfToday || deadline >= endOfWeek) return false;
        }
      }

      // Overdue filter
      if (taskFilters.isOverdue !== 'all') {
        const effectiveDl = (task as any).extended_deadline || task.deadline;
        const isTaskOverdue = effectiveDl && new Date(effectiveDl) < now && 
          task.status !== 'DONE' && task.status !== 'VERIFIED';
        if (taskFilters.isOverdue === 'yes' && !isTaskOverdue) return false;
        if (taskFilters.isOverdue === 'no' && isTaskOverdue) return false;
      }

      // Submission filter
      if (taskFilters.hasSubmission !== 'all') {
        if (taskFilters.hasSubmission === 'yes' && !task.submission_link) return false;
        if (taskFilters.hasSubmission === 'no' && task.submission_link) return false;
      }

      return true;
    });
  }, [baseVisibleTasks, taskFilters]);


  const unstagedTasks = getTasksByStage(null).filter(t => 
    showHidden || isLeaderInGroup ? true : !t.is_hidden
  ).filter(t => visibleTasks.some(vt => vt.id === t.id));

  // Count hidden items
  const hiddenTasksCount = tasks.filter(t => t.is_hidden).length;
  const hiddenStagesCount = stages.filter(s => s.is_hidden).length;

  // Calculate stats (based on visible tasks only for non-leaders)
  const totalTasks = visibleTasks.length;
  const completedTasks = visibleTasks.filter(t => t.status === 'DONE' || t.status === 'VERIFIED').length;
  const overdueTasks = visibleTasks.filter(t => isOverdue((t as any).extended_deadline || t.deadline) && t.status !== 'DONE' && t.status !== 'VERIFIED').length;
  const inProgressTasks = visibleTasks.filter(t => t.status === 'IN_PROGRESS').length;

  // Check if any filters are active
  const hasActiveFilters = taskFilters.searchText || 
    taskFilters.status !== 'all' || 
    taskFilters.assignee !== 'all' || 
    taskFilters.hasDeadline !== 'all' || 
    taskFilters.isOverdue !== 'all' || 
    taskFilters.hasSubmission !== 'all';

  return (
    <>
      {/* Header with stats - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Task & Giai đoạn</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{totalTasks} task{hasActiveFilters ? ' (đã lọc)' : ''}</span>
              <span className="text-success">• {completedTasks} xong</span>
              {inProgressTasks > 0 && <span className="text-warning">• {inProgressTasks} đang làm</span>}
              {overdueTasks > 0 && <span className="text-destructive">• {overdueTasks} trễ</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-select toggle for leaders */}
          {isLeaderInGroup && (
            <Button
              variant={isMultiSelectMode ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                if (isMultiSelectMode) {
                  clearSelection();
                } else {
                  setIsMultiSelectMode(true);
                }
              }}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMultiSelectMode ? 'Hủy chọn' : 'Chọn nhiều'}</span>
            </Button>
          )}

          {isLeaderInGroup && (hiddenTasksCount > 0 || hiddenStagesCount > 0) && (
            <Button
              variant={showHidden ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowHidden(!showHidden)}
            >
              {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showHidden ? 'Đang hiện ẩn' : `${hiddenTasksCount + hiddenStagesCount} ẩn`}
            </Button>
          )}

          {/* Auto-collapse completed stages toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={autoCollapseCompleted ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={toggleAutoCollapse}
                >
                  <FolderCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{autoCollapseCompleted ? 'Đang gọn' : 'Gọn xong'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Tự động thu gọn giai đoạn đã hoàn thành 100%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-44 h-8 text-xs bg-background">
              <SelectValue placeholder="Lọc giai đoạn" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all" className="text-xs">Tất cả giai đoạn</SelectItem>
              {visibleStages.map((stage, index) => {
                const color = getStageColor(index);
                return (
                  <SelectItem key={stage.id} value={stage.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                      {stage.name}
                      {stage.is_hidden && <EyeOff className="w-3 h-3 text-muted-foreground" />}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Multi-select bulk action bar */}
      {isMultiSelectMode && (
        <div className="mb-3 flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-muted/50">
          <Checkbox
            checked={selectedTaskIds.size === visibleTasks.length && visibleTasks.length > 0}
            onCheckedChange={(checked) => {
              if (checked) selectAllVisibleTasks();
              else setSelectedTaskIds(new Set());
            }}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {selectedTaskIds.size > 0 ? `Đã chọn ${selectedTaskIds.size} task` : 'Chọn tất cả'}
          </span>
          
          {selectedTaskIds.size > 0 && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="TODO">Chờ xử lý</SelectItem>
                  <SelectItem value="IN_PROGRESS">Đang làm</SelectItem>
                  <SelectItem value="DONE">Hoàn thành</SelectItem>
                  <SelectItem value="VERIFIED">Đã duyệt</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setBulkAction('status')} disabled={isBulkProcessing}>
                <CheckCircle2 className="w-3 h-3" />
                Đổi trạng thái
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => setBulkAction('delete')} disabled={isBulkProcessing}>
                <Trash2 className="w-3 h-3" />
                Xóa
              </Button>
            </>
          )}
          
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto" onClick={clearSelection}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Task Filters */}
      <div className="mb-4">
        <TaskFilters
          filters={taskFilters}
          onFiltersChange={setTaskFilters}
          members={members}
          tasks={baseVisibleTasks}
          onReset={() => setTaskFilters(defaultTaskFilters)}
        />
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {filteredStages.map((stage, stageIndex) => {
            // Filter stage tasks to only include visible (filtered) tasks
            const allStageTasks = getTasksByStage(stage.id).filter(t => 
              showHidden || isLeaderInGroup ? true : !t.is_hidden
            );
            const stageTasks = allStageTasks.filter(t => visibleTasks.some(vt => vt.id === t.id));
            const completedCount = stageTasks.filter(t => t.status === 'DONE' || t.status === 'VERIFIED').length;
            const overdueCount = stageTasks.filter(t => isOverdue((t as any).extended_deadline || t.deadline) && t.status !== 'DONE' && t.status !== 'VERIFIED').length;
            const isExpanded = expandedStages.has(stage.id);
            const stageColor = getStageColor(stageIndex);
            const progressPercent = stageTasks.length > 0 ? (completedCount / stageTasks.length) * 100 : 0;
            const hiddenTasksInStage = getTasksByStage(stage.id).filter(t => t.is_hidden).length;
            
            // Skip stages with no visible tasks when filters are active
            if (hasActiveFilters && stageTasks.length === 0) return null;

            return (
              <Card 
                key={stage.id} 
                className={`overflow-hidden shadow-sm ${stage.is_hidden ? 'opacity-60 border-dashed' : ''}`}
              >
                {/* Colored top stripe like Scores page */}
                <div className="h-1" style={{ background: `hsl(var(--stage-${Math.min(stageIndex + 1, 6)}))` }} />
                
                {/* Stage Header */}
                <CardHeader 
                  className="py-2.5 px-4 cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => toggleStage(stage.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 p-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                      {/* Numbered badge like Scores page */}
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0"
                        style={{ background: `hsl(var(--stage-${Math.min(stageIndex + 1, 6)}))` }}
                      >
                        {stageIndex + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold truncate">
                          {stage.name}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground">
                          {stageTasks.length} task · {completedCount} hoàn thành
                          {hiddenTasksInStage > 0 && isLeaderInGroup && ` · ${hiddenTasksInStage} ẩn`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {overdueCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
                            {overdueCount} trễ
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      
                      {stage.is_hidden && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1 text-muted-foreground">
                          <EyeOff className="w-3 h-3" /> Ẩn
                        </Badge>
                      )}
                      
                      {isLeaderInGroup && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover min-w-[140px]">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditStage(stage); }} className="text-xs">
                              <Edit className="w-3.5 h-3.5 mr-2" />
                              Đổi tên
                            </DropdownMenuItem>
                            {onToggleStageHidden && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStageHidden(stage); }} className="text-xs">
                                {stage.is_hidden ? (
                                  <><Eye className="w-3.5 h-3.5 mr-2" />Hiện giai đoạn</>
                                ) : (
                                  <><EyeOff className="w-3.5 h-3.5 mr-2" />Ẩn giai đoạn</>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteStage(stage); }} className="text-destructive text-xs">
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {/* Tasks List with Drag & Drop */}
                {isExpanded && (
                  <CardContent className="p-3">
                     {stageTasks.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-lg bg-muted/10">
                        <Layers className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                        Chưa có task
                      </div>
                    ) : (
                      <Droppable droppableId={stage.id} type="TASK">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-2 min-h-[40px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                          >
                            {(() => {
                              const INITIAL_RENDER_LIMIT = 30;
                              const [showAll, setShowAll] = useState(stageTasks.length <= INITIAL_RENDER_LIMIT);
                              const visibleTasks = showAll ? stageTasks : stageTasks.slice(0, INITIAL_RENDER_LIMIT);
                              return (
                                <>
                                  {visibleTasks.map((task, index) => (
                                    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!isLeaderInGroup || isMultiSelectMode}>
                                      {(dragProvided, dragSnapshot) => (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          style={dragProvided.draggableProps.style}
                                          className={dragSnapshot.isDragging ? 'opacity-90 shadow-lg rounded-lg' : ''}
                                        >
                                          <TaskRow
                                            task={task}
                                            taskCode={getTaskCode(task, stages, stageIndex, index)}
                                            stageColor={stageColor}
                                            isLeaderInGroup={isLeaderInGroup}
                                            isAssignee={isUserAssignee(task)}
                                            groupId={groupId}
                                            groupSlug={groupSlug}
                                            onEditTask={onEditTask}
                                            openSubmissionDialog={openSubmissionDialog}
                                            openDetailDialog={openDetailDialog}
                                            setTaskToDelete={setTaskToDelete}
                                            onScoreTask={isLeaderInGroup ? openScoringDialog : undefined}
                                            onToggleHidden={isLeaderInGroup ? handleToggleTaskHidden : undefined}
                                            onQuickStatusChange={isLeaderInGroup ? handleQuickStatusChange : undefined}
                                            isMultiSelectMode={isMultiSelectMode}
                                            isSelected={selectedTaskIds.has(task.id)}
                                            onToggleSelect={toggleTaskSelect}
                                            meeting={meetingsByTaskId[task.id]}
                                            onJoinMeeting={handleJoinMeeting}
                                            dragHandleProps={dragProvided.dragHandleProps}
                                            isExpandedMobile={expandedMobileTaskId === task.id}
                                            onToggleMobileExpand={toggleMobileExpand}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {!showAll && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full text-xs text-muted-foreground"
                                      onClick={() => setShowAll(true)}
                                    >
                                      Hiện thêm {stageTasks.length - INITIAL_RENDER_LIMIT} task còn lại
                                    </Button>
                                  )}
                                </>
                              );
                            })()}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                    {isLeaderInGroup && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-muted-foreground hover:text-foreground border-dashed border mt-2.5 h-8 text-xs"
                        onClick={() => onCreateTask(stage.id)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Thêm task
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Unstaged Tasks with Drag & Drop */}
          {filterStage === 'all' && unstagedTasks.length > 0 && (
            <Card className="overflow-hidden">
              <div className="h-1 bg-muted-foreground/30" />
              <CardHeader className="py-2.5 px-4 cursor-pointer hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-muted text-muted-foreground shrink-0">
                    ?
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Chưa phân giai đoạn</CardTitle>
                    <p className="text-[11px] text-muted-foreground">{unstagedTasks.length} task</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <Droppable droppableId="unstaged" type="TASK">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[40px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                    >
                      {unstagedTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!isLeaderInGroup || isMultiSelectMode}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              style={dragProvided.draggableProps.style}
                              className={dragSnapshot.isDragging ? 'opacity-90 shadow-lg rounded-lg' : ''}
                            >
                              <TaskRow
                                task={task}
                                taskCode={null}
                                stageColor={{ bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted', dot: 'bg-muted-foreground/50', accent: 'bg-muted/50' }}
                                isLeaderInGroup={isLeaderInGroup}
                                isAssignee={isUserAssignee(task)}
                                groupId={groupId}
                                groupSlug={groupSlug}
                                onEditTask={onEditTask}
                                openSubmissionDialog={openSubmissionDialog}
                                openDetailDialog={openDetailDialog}
                                setTaskToDelete={setTaskToDelete}
                                onScoreTask={isLeaderInGroup ? openScoringDialog : undefined}
                                onQuickStatusChange={isLeaderInGroup ? handleQuickStatusChange : undefined}
                                isMultiSelectMode={isMultiSelectMode}
                                isSelected={selectedTaskIds.has(task.id)}
                                onToggleSelect={toggleTaskSelect}
                                meeting={meetingsByTaskId[task.id]}
                                onJoinMeeting={handleJoinMeeting}
                                dragHandleProps={dragProvided.dragHandleProps}
                                isExpandedMobile={expandedMobileTaskId === task.id}
                                onToggleMobileExpand={toggleMobileExpand}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {stages.length === 0 && unstagedTasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Chưa có giai đoạn nào</p>
              <p className="text-sm">Tạo giai đoạn đầu tiên để bắt đầu</p>
            </div>
          )}
        </div>
      </DragDropContext>

      {/* Delete Task Confirmation */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa task</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              Bạn có chắc muốn xóa task <span className="font-semibold">"{taskToDelete?.title}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <Button
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xóa'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkAction === 'delete'} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa <span className="font-semibold">{selectedTaskIds.size} task</span> đã chọn? Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Hủy</AlertDialogCancel>
            <Button
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Xóa ${selectedTaskIds.size} task`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Confirmation */}
      <AlertDialog open={bulkAction === 'status'} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Đổi trạng thái hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn đổi trạng thái <span className="font-semibold">{selectedTaskIds.size} task</span> thành <span className="font-semibold">{getStatusLabel(bulkStatus, false)}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Hủy</AlertDialogCancel>
            <Button onClick={handleBulkStatusChange} disabled={isBulkProcessing}>
              {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác nhận'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submission Dialog */}
      <TaskSubmissionDialog
        task={submissionTask}
        isOpen={isSubmissionOpen}
        onClose={() => {
          setIsSubmissionOpen(false);
          setSubmissionTask(null);
        }}
        onSave={onRefresh}
        isAssignee={submissionTask ? isUserAssignee(submissionTask) : false}
        isLeaderInGroup={isLeaderInGroup}
      />

      {/* Detail Dialog (view-only for non-assignees) */}
      <TaskSubmissionDialog
        task={detailTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailTask(null);
        }}
        onSave={onRefresh}
        isAssignee={isDetailAssignee}
        isLeaderInGroup={isLeaderInGroup}
        viewOnly={!isDetailAssignee && !isLeaderInGroup}
      />

      {/* Scoring Dialog for Leader */}
      {isLeaderInGroup && (
        <TaskScoringDialog
          isOpen={isScoringOpen}
          onClose={() => {
            setIsScoringOpen(false);
            setScoringTask(null);
          }}
          task={scoringTask}
          members={members}
          taskScores={taskScores}
          onScoreUpdated={() => {
            fetchTaskScores();
            onRefresh();
          }}
        />
      )}
    </>
  );
}
