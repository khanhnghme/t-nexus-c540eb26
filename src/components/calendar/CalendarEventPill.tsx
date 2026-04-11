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

const GoogleIconSmall = () => (
  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function CalendarEventPill({ event, compact = false, onEventClick }: CalendarEventPillProps) {
  const { locale, translations: { app: t } } = useLanguage();
  const cal = t.calendar;
  const dateLocale = locale === 'vi' ? viLocale : undefined;

  const isOverdue = event.type === 'task' && event.taskStatus !== 'DONE' && event.taskStatus !== 'VERIFIED' && event.date < new Date();
  const isDone = event.type === 'task' && (event.taskStatus === 'DONE' || event.taskStatus === 'VERIFIED');
  const isInProgress = event.type === 'task' && event.taskStatus === 'IN_PROGRESS';
  const isExternal = event.source === 'external';

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
          {isExternal && <GoogleIconSmall />}
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
        <p className="font-semibold flex items-center gap-1">
          {isExternal && <GoogleIconSmall />}
          {event.title}
        </p>
        {event.type === 'task' && event.projectName && (
          <p className="text-xs text-muted-foreground">📁 {cal.project}: {event.projectName}</p>
        )}
        <p className="text-xs text-muted-foreground">
          🕐 {format(event.date, "HH:mm dd/MM/yyyy", { locale: dateLocale })}
        </p>
        {isExternal && (
          <p className="text-xs" style={{ color: '#4285f4' }}>🔄 Google Calendar</p>
        )}
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
