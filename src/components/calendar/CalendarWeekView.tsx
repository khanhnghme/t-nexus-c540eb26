import { useMemo } from 'react';
import { startOfWeek, addDays, isToday, format } from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import CalendarEventPill from './CalendarEventPill';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarWeekView({ currentDate, events, onDayClick, onEventClick }: CalendarWeekViewProps) {
  const { translations: { app: t } } = useLanguage();
  const WEEKDAY_LABELS = t.calendar.weekdayLabels as string[];

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const eventsByDayHour = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const dayKey = format(ev.date, 'yyyy-MM-dd');
      const hourKey = ev.date.getHours();
      const key = `${dayKey}-${hourKey}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [events]);

  return (
    <div className="flex-1 flex flex-col border border-muted rounded-lg overflow-hidden">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-primary">
        <div className="p-2" />
        {weekDays.map((day, i) => (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className="py-2 text-center border-l border-primary-foreground/20 cursor-pointer hover:bg-primary/80 transition-colors"
          >
            <div className="text-xs font-medium text-primary-foreground/80">{WEEKDAY_LABELS[i]}</div>
            <div className={cn(
              "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto mt-0.5",
              isToday(day) && "bg-accent text-accent-foreground",
              !isToday(day) && "text-primary-foreground",
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="h-12 border-b border-muted px-2 text-[10px] text-muted-foreground flex items-start justify-end pt-0.5">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((day) => {
                const key = `${format(day, 'yyyy-MM-dd')}-${hour}`;
                const cellEvents = eventsByDayHour.get(key) || [];
                return (
                  <div
                    key={key}
                    className="h-12 border-b border-l border-muted p-0.5 hover:bg-accent/10 transition-colors"
                  >
                    {cellEvents.map((ev) => (
                      <CalendarEventPill key={ev.id} event={ev} compact onEventClick={onEventClick} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
