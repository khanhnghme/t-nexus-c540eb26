import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, format } from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import CalendarEventPill from './CalendarEventPill';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const MAX_VISIBLE_EVENTS = 4;

export default function CalendarMonthView({ currentDate, events, onDayClick, onEventClick }: CalendarMonthViewProps) {
  const { translations: { app: t } } = useLanguage();
  const cal = t.calendar;
  const WEEKDAYS = cal.weekdays as string[];

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const key = format(ev.date, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [events]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  return (
    <div className="flex-1 flex flex-col border border-muted rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-primary">
        {WEEKDAYS.map((day: string) => (
          <div key={day} className="py-2 text-center text-sm font-semibold text-primary-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-muted last:border-b-0">
            {week.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(key) || [];
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const hasMore = dayEvents.length > MAX_VISIBLE_EVENTS;

              return (
                <div
                  key={key}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    "border-r border-muted last:border-r-0 p-1 cursor-pointer hover:bg-accent/10 transition-colors flex flex-col",
                    !inMonth && "bg-muted/30",
                    today && "bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-accent",
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mb-0.5 mx-auto sm:mx-0",
                      today && "bg-accent text-accent-foreground",
                      !today && inMonth && "text-foreground",
                      !today && !inMonth && "text-muted-foreground/40",
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((ev) => (
                      <CalendarEventPill key={ev.id} event={ev} compact onEventClick={onEventClick} />
                    ))}
                    {hasMore && (
                      <p className="text-[10px] text-muted-foreground font-medium pl-1">
                        {(cal.moreEvents as string).replace('{n}', String(dayEvents.length - MAX_VISIBLE_EVENTS))}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
