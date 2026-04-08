import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { CalendarEvent } from '@/types/calendar';
import CalendarEventPill from './CalendarEventPill';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarDayView({ currentDate, events, onEventClick }: CalendarDayViewProps) {
  const { locale } = useLanguage();
  const dateLocale = locale === 'vi' ? viLocale : undefined;

  const eventsByHour = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    const dayStr = format(currentDate, 'yyyy-MM-dd');
    events
      .filter((ev) => format(ev.date, 'yyyy-MM-dd') === dayStr)
      .forEach((ev) => {
        const h = ev.date.getHours();
        if (!map.has(h)) map.set(h, []);
        map.get(h)!.push(ev);
      });
    return map;
  }, [currentDate, events]);

  const today = isToday(currentDate);

  return (
    <div className="flex-1 flex flex-col border border-muted rounded-lg overflow-hidden">
      <div className="py-3 border-b border-muted bg-primary text-center">
        <div className="text-xs font-medium text-primary-foreground/80 capitalize">{format(currentDate, 'EEEE', { locale: dateLocale })}</div>
        <div className={cn(
          "text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full mx-auto mt-0.5",
          today && "bg-accent text-accent-foreground",
          !today && "text-primary-foreground",
        )}>
          {format(currentDate, 'd')}
        </div>
        <div className="text-xs text-primary-foreground/70 capitalize">{format(currentDate, 'MMMM yyyy', { locale: dateLocale })}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour) => {
          const hourEvents = eventsByHour.get(hour) || [];
          return (
            <div key={hour} className="flex border-b border-muted min-h-[56px]">
              <div className="w-16 flex-shrink-0 px-2 py-1 text-xs text-muted-foreground text-right border-r border-muted">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-1 space-y-0.5 hover:bg-accent/10 transition-colors">
                {hourEvents.map((ev) => (
                  <CalendarEventPill key={ev.id} event={ev} onEventClick={onEventClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
