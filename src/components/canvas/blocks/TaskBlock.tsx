import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTaskBlockContext } from "./TaskBlockContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  task_assignments: {
    profiles: { full_name: string; avatar_url: string | null } | null;
  }[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  TODO: { label: "Cần làm", variant: "outline" },
  IN_PROGRESS: { label: "Đang làm", variant: "secondary" },
  DONE: { label: "Hoàn thành", variant: "default" },
  VERIFIED: { label: "Đã duyệt", variant: "default" },
};

function TaskListRenderer() {
  const { groupId } = useTaskBlockContext();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    const fetchTasks = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, deadline, task_assignments(profiles(full_name, avatar_url))")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!cancelled && data) {
        setTasks(data as unknown as TaskRow[]);
      }
      if (!cancelled) setLoading(false);
    };

    fetchTasks();
    return () => { cancelled = true; };
  }, [groupId]);

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2 border rounded-lg bg-muted/30">
        <ListChecks className="h-6 w-6" />
        <p className="text-sm">Chưa có công việc nào trong dự án.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Danh sách công việc</span>
        <Badge variant="secondary" className="ml-auto text-xs">{tasks.length}</Badge>
      </div>
      <div className="divide-y">
        {tasks.map((task) => {
          const cfg = statusConfig[task.status] ?? statusConfig.TODO;
          const assignees = task.task_assignments
            ?.map((a) => a.profiles?.full_name)
            .filter(Boolean);

          return (
            <div key={task.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/30 transition-colors">
              <span className="flex-1 truncate font-medium">{task.title}</span>
              <Badge variant={cfg.variant} className="shrink-0 text-xs">
                {cfg.label}
              </Badge>
              {assignees && assignees.length > 0 && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0 max-w-[120px] truncate">
                  <User className="h-3 w-3" />
                  {assignees[0]}
                  {assignees.length > 1 && ` +${assignees.length - 1}`}
                </span>
              )}
              {task.deadline && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.deadline), "dd/MM")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const TaskListBlock = createReactBlockSpec(
  {
    type: "taskList" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      return (
        <div className="my-2" contentEditable={false}>
          <TaskListRenderer />
        </div>
      );
    },
  }
);
