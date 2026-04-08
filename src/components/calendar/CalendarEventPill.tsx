import { CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalendarEventPillProps {
  event: CalendarEvent;
  compact?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

export default function CalendarEventPill({ event, compact = false, onEventClick }: CalendarEventPillProps) {
  const { locale, translations: { app: t } } = useLanguage();
  const cal = t.calendar;
  const dateLocale = locale === 'vi' ? viLocale : undefined;

  const isOverdue = event.type === 'task' && event.taskStatus !== 'DONE' && event.taskStatus !== 'VERIFIED' && event.date < new Date();
  const isDone = event.type === 'task' && (event.taskStatus === 'DONE' || event.taskStatus === 'VERIFIED');
  const isInProgress = event.type === 'task' && event.taskStatus === 'IN_PROGRESS';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const pillColor = event.type === 'personal' ? event.color || '#3b82f6' : undefined;

  const StatusDot = () => {
    if (event.type !== 'task') return null;
    if (compact) {
      return (
        <span className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          isOverdue && "bg-destructive",
          isDone && "bg-green-600",
          isInProgress && "bg-amber-500",
          !isOverdue && !isDone && !isInProgress && "bg-primary",
        )} />
      );
    }
    if (isOverdue) return <AlertTriangle className="w-3 h-3 flex-shrink-0" />;
    if (isDone) return <CheckCircle2 className="w-3 h-3 flex-shrink-0" />;
    if (isInProgress) return <Loader2 className="w-3 h-3 flex-shrink-0" />;
    return <Circle className="w-3 h-3 flex-shrink-0" />;
  };

  const timeStr = format(event.date, 'HH:mm');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            "w-full text-left rounded px-1.5 py-0.5 text-[11px] leading-tight font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-sm",
            event.type === 'task' && !isOverdue && !isDone && !isInProgress && "bg-primary/30 text-primary-foreground/90 dark:text-primary hover:bg-primary/40 border border-primary/30",
            event.type === 'task' && isInProgress && "bg-amber-100 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/40 border border-amber-300 dark:border-amber-500/40",
            event.type === 'task' && isOverdue && "bg-red-100 text-red-700 dark:bg-red-500/25 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/35 ring-1 ring-red-400 dark:ring-red-500/50 font-bold",
            event.type === 'task' && isDone && "bg-green-100 text-green-700 dark:bg-green-500/25 dark:text-green-400 border border-green-300 dark:border-green-500/30",
            event.type === 'personal' && "text-white hover:opacity-90 border border-white/20 shadow-md",
          )}
          style={event.type === 'personal' ? { backgroundColor: pillColor } : undefined}
        >
          <StatusDot />
          {compact ? (
            <span className="truncate">{event.title}</span>
          ) : (
            <>
              <span className="opacity-70 flex-shrink-0 font-mono text-[10px]">{timeStr}</span>
              {event.type === 'task' && event.projectName && (
                <span className="opacity-60 truncate text-[10px]">[{event.projectName}]</span>
              )}
              <span className="truncate">{event.title}</span>
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[250px]">
        <p className="font-semibold">{event.title}</p>
        {event.type === 'task' && event.projectName && (
          <p className="text-xs text-muted-foreground">📁 {cal.project}: {event.projectName}</p>
        )}
        <p className="text-xs text-muted-foreground">
          🕐 {format(event.date, "HH:mm dd/MM/yyyy", { locale: dateLocale })}
        </p>
        {event.type === 'task' && isOverdue && (
          <p className="text-xs text-destructive font-medium">⚠ {cal.overdue}</p>
        )}
        {event.type === 'task' && isDone && (
          <p className="text-xs text-green-600 font-medium">✅ {cal.completed}</p>
        )}
        {event.type === 'task' && isInProgress && (
          <p className="text-xs text-amber-600 font-medium">⏳ {cal.inProgress}</p>
        )}
        {event.description && (
          <p className="text-xs mt-1">{event.description}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
