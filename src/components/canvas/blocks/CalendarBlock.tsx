import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTaskBlockContext } from "./TaskBlockContext";
import { Badge } from "@/components/ui/badge";
import BlockSkeleton from "./BlockSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { parseLocalDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeadlineTask {
  id: string;
  title: string;
  deadline: string;
  status: string;
}

const CalendarRenderer = memo(function CalendarRenderer() {
  const { groupId, editable } = useTaskBlockContext();
  const [tasks, setTasks] = useState<DeadlineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from("tasks")
      .select("id, title, deadline, status")
      .eq("group_id", groupId)
      .not("deadline", "is", null)
      .order("deadline", { ascending: true });

    if (data) {
      setTasks(data as DeadlineTask[]);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`calendar-tasks-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchTasks]);

  // Group tasks by date string for quick lookup
  const tasksByDate = useMemo(() => {
    const map = new Map<string, DeadlineTask[]>();
    tasks.forEach((t) => {
      const d = parseLocalDateTime(t.deadline);
      if (!d) return;
      const key = format(d, "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    });
    return map;
  }, [tasks]);

  const deadlineDates = useMemo(() => {
    const dates: Date[] = [];
    tasksByDate.forEach((_, key) => {
      dates.push(new Date(key + "T00:00:00"));
    });
    return dates;
  }, [tasksByDate]);

  const getTasksForDay = useCallback(
    (day: Date) => {
      const key = format(day, "yyyy-MM-dd");
      return tasksByDate.get(key) || [];
    },
    [tasksByDate]
  );

  if (loading) {
    return <BlockSkeleton variant="calendar" />;
  }

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Lịch deadline</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {tasks.length}
        </Badge>
      </div>

      {/* Calendar */}
      <div className="p-2 flex justify-center">
        <TooltipProvider delayDuration={200}>
          <DayPicker
            mode="single"
            selected={selectedDay || undefined}
            onSelect={(day) => {
              if (day && selectedDay && isSameDay(day, selectedDay)) {
                setSelectedDay(null);
              } else {
                setSelectedDay(day || null);
              }
            }}
            month={month}
            onMonthChange={setMonth}
            locale={vi}
            showOutsideDays
            className={cn("p-3 pointer-events-auto")}
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
              ),
              day_today: "bg-accent text-accent-foreground",
              day_outside: "day-outside text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
            modifiers={{
              hasDeadline: deadlineDates,
            }}
            modifiersClassNames={{
              hasDeadline: "calendar-deadline-dot",
            }}
            components={{
              DayContent: ({ date }) => {
                const dayTasks = getTasksForDay(date);
                const hasDeadline = dayTasks.length > 0;

                const content = (
                  <div className="relative flex items-center justify-center w-full h-full">
                    <span>{date.getDate()}</span>
                    {hasDeadline && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayTasks.slice(0, 3).map((_, i) => (
                          <span
                            key={i}
                            className="block h-1 w-1 rounded-full bg-primary"
                          />
                        ))}
                      </span>
                    )}
                  </div>
                );

                if (!hasDeadline) return content;

                return (
                  <Tooltip>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <p className="font-medium text-xs mb-1">
                        {format(date, "dd/MM/yyyy")}
                      </p>
                      <ul className="space-y-0.5">
                        {dayTasks.map((t) => (
                          <li key={t.id} className="text-xs truncate">
                            • {t.title}
                          </li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                );
              },
            }}
          />
        </TooltipProvider>
      </div>

      {/* Selected Day Panel */}
      {selectedDay && (() => {
        const dayTasks = getTasksForDay(selectedDay);
        return (
          <div className="border-t px-3 py-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {format(selectedDay, "dd/MM/yyyy")}
            </p>
            {dayTasks.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Không có deadline</p>
            )}
            {dayTasks.length > 0 && (
              <ul className="space-y-1">
                {dayTasks.map((t) => {
                  const statusColor =
                    t.status === "DONE" || t.status === "VERIFIED"
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : t.status === "IN_PROGRESS"
                      ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                      : "bg-muted text-muted-foreground";
                  const statusLabel =
                    t.status === "DONE"
                      ? "Done"
                      : t.status === "VERIFIED"
                      ? "Verified"
                      : t.status === "IN_PROGRESS"
                      ? "In Progress"
                      : "Todo";
                  const deadlineDate = parseLocalDateTime(t.deadline);
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="truncate flex-1">• {t.title}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {deadlineDate && (
                          <span className="text-muted-foreground">
                            {format(deadlineDate, "HH:mm")}
                          </span>
                        )}
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium",
                            statusColor
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {editable && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newTaskTitle.trim() || adding) return;
                  setAdding(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      toast.error("Bạn cần đăng nhập");
                      return;
                    }
                    const deadline = format(selectedDay, "yyyy-MM-dd") + "T23:59:00";
                    const { error } = await supabase.from("tasks").insert({
                      title: newTaskTitle.trim(),
                      group_id: groupId,
                      status: "TODO",
                      deadline,
                      created_by: user.id,
                    });
                    if (error) throw error;
                    setNewTaskTitle("");
                    toast.success("Đã tạo task");
                  } catch (err: any) {
                    toast.error(err.message || "Không thể tạo task");
                  } finally {
                    setAdding(false);
                  }
                }}
                className="flex items-center gap-1.5 pt-1 border-t border-dashed"
              >
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="+ Thêm task deadline..."
                  className="h-7 text-xs flex-1"
                  disabled={adding}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={adding || !newTaskTitle.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </form>
            )}
          </div>
        );
      })()}
    </div>
  );
});

export const CalendarBlock = createReactBlockSpec(
  {
    type: "calendarView" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      return (
        <div className="my-2" contentEditable={false}>
          <CalendarRenderer />
        </div>
      );
    },
  }
);
