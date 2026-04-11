import { useState, useMemo } from 'react';
import { useProjectCalendar } from '@/hooks/useProjectCalendar';
import { useNavigate } from 'react-router-dom';
import CalendarMonthView from './CalendarMonthView';
import CalendarWeekView from './CalendarWeekView';
import CalendarDayView from './CalendarDayView';
import CalendarDayDetail from './CalendarDayDetail';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, format, isSameDay,
} from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import type { CalendarViewMode, CalendarEvent } from '@/types/calendar';

interface ProjectCalendarViewProps {
  groupId: string;
  projectSlug?: string;
}

export default function ProjectCalendarView({ groupId, projectSlug }: ProjectCalendarViewProps) {
  const { events, isLoading } = useProjectCalendar(groupId);
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  const handlePrevious = () => {
    if (viewMode === 'month') setCurrentDate(d => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subDays(d, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(d => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setDayDetailOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'task' && event.projectSlug && event.taskSlug) {
      navigate(`/p/${event.projectSlug}/task/${event.taskSlug}`);
    }
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter(e => isSameDay(e.date, selectedDay));
  }, [selectedDay, events]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const title = format(currentDate, viewMode === 'day' ? 'dd MMMM yyyy' : 'MMMM yyyy', { locale: viLocale });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm capitalize">{title}</h3>
          <Badge variant="outline" className="text-[10px]">{events.length} deadline</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCurrentDate(new Date())}>
            Hôm nay
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="flex border rounded-md ml-2">
            {(['month', 'week', 'day'] as CalendarViewMode[]).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => setViewMode(mode)}
              >
                {mode === 'month' ? 'Tháng' : mode === 'week' ? 'Tuần' : 'Ngày'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'month' && (
        <CalendarMonthView
          currentDate={currentDate}
          events={events}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      )}
      {viewMode === 'week' && (
        <CalendarWeekView
          currentDate={currentDate}
          events={events}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      )}
      {viewMode === 'day' && (
        <CalendarDayView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
        />
      )}

      {/* Day detail */}
      <CalendarDayDetail
        open={dayDetailOpen && !!selectedDay}
        onOpenChange={(open) => { setDayDetailOpen(open); if (!open) setSelectedDay(null); }}
        date={selectedDay || new Date()}
        events={selectedDayEvents}
        onEventClick={handleEventClick}
      />
    </div>
  );
}
