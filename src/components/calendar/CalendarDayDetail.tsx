import { format } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { CalendarEvent } from '@/types/calendar';
import CalendarEventPill from './CalendarEventPill';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalendarDayDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  events: CalendarEvent[];
  onEditEvent?: (event: CalendarEvent) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export default function CalendarDayDetail({ open, onOpenChange, date, events, onEditEvent, onEventClick }: CalendarDayDetailProps) {
  const { locale, translations: { app: t } } = useLanguage();
  const cal = t.calendar;
  const dateLocale = locale === 'vi' ? viLocale : undefined;

  const dayEvents = events
    .filter((ev) => format(ev.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const handleEventInteraction = (ev: CalendarEvent) => {
    if (ev.type === 'task' && onEventClick) {
      onEventClick(ev);
    } else if (ev.type === 'personal' && onEditEvent) {
      onEditEvent(ev);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {format(date, "EEEE, dd MMMM yyyy", { locale: dateLocale })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {dayEvents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{cal.noEvents}</p>
          )}
          {dayEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-2 rounded-md border border-border hover:bg-accent/30 cursor-pointer transition-colors"
              onClick={() => handleEventInteraction(ev)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ev.type === 'personal' ? (ev.color || '#3b82f6') : 'hsl(var(--primary))' }}
                />
                <span className="text-sm font-medium truncate">{ev.title}</span>
              </div>
              <div className="ml-[18px] text-xs text-muted-foreground mt-0.5">
                {format(ev.date, 'HH:mm')}
                {ev.type === 'task' && ev.projectName && ` · ${ev.projectName}`}
                {ev.type === 'task' && (
                  <span className={(ev.taskStatus as string) === 'DONE' || (ev.taskStatus as string) === 'VERIFIED' ? ' text-green-600' : ev.date < new Date() ? ' text-destructive' : ''}>
                    {(ev.taskStatus as string) === 'DONE' ? ` ✓ ${cal.done}` : (ev.taskStatus as string) === 'VERIFIED' ? ` ✓ ${cal.verified}` : ''}
                  </span>
                )}
              </div>
              {ev.description && <p className="ml-[18px] text-xs text-muted-foreground mt-1">{ev.description}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
