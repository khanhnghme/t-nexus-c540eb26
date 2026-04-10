import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Building2 } from 'lucide-react';
import { CalendarViewMode } from '@/types/calendar';
import { format, isSameMonth } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GoogleCalendarConnect from './GoogleCalendarConnect';

interface WorkspaceOption {
  id: string;
  name: string;
}

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddEvent: () => void;
  workspaces?: WorkspaceOption[];
  wsFilter?: string;
  onWsFilterChange?: (value: string) => void;
  gcal?: {
    isConnected: boolean;
    isSyncing: boolean;
    isChecking: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onSync: () => void;
  };
}

export default function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
  onAddEvent,
  workspaces = [],
  wsFilter = 'all',
  onWsFilterChange,
  gcal,
}: CalendarHeaderProps) {
  const { locale, translations: { app: t } } = useLanguage();
  const cal = t.calendar;
  const isCurrentMonth = isSameMonth(currentDate, new Date());
  const dateLocale = locale === 'vi' ? viLocale : undefined;

  const getTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, "MMMM, yyyy", { locale: dateLocale });
    }
    if (viewMode === 'week') {
      return `${cal.weekLabel} ${format(currentDate, "w", { locale: dateLocale })} - ${format(currentDate, "MMMM yyyy", { locale: dateLocale })}`;
    }
    return format(currentDate, "EEEE, dd MMMM yyyy", { locale: dateLocale });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <Button variant="outline" size="icon" onClick={onPrevious} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNext} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl font-bold capitalize text-foreground tracking-tight">{getTitle()}</h2>
        <Button
          variant={isCurrentMonth ? "outline" : "default"}
          size="sm"
          onClick={onToday}
          className={`ml-1 h-7 text-xs ${!isCurrentMonth ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}`}
        >
          {cal.today}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {workspaces.length > 0 && onWsFilterChange && (
          <Select value={wsFilter} onValueChange={onWsFilterChange}>
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <Building2 className="h-3 w-3 mr-1 shrink-0" />
              <SelectValue placeholder="Workspace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{cal.allWorkspaces}</SelectItem>
              {workspaces.map(ws => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {gcal && (
          <GoogleCalendarConnect
            isConnected={gcal.isConnected}
            isSyncing={gcal.isSyncing}
            isChecking={gcal.isChecking}
            onConnect={gcal.onConnect}
            onDisconnect={gcal.onDisconnect}
            onSync={gcal.onSync}
          />
        )}
        <Button size="sm" onClick={onAddEvent} className="h-7 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
          <Plus className="h-3.5 w-3.5" />
          {cal.createEvent}
        </Button>
        <div className="flex rounded-md border border-input overflow-hidden">
          {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent/20'
              }`}
            >
              {mode === 'month' ? cal.month : mode === 'week' ? cal.week : cal.day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
