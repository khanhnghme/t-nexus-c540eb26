import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTaskBlockContext } from "./TaskBlockContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListChecks, Calendar, User, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const { groupId, editable } = useTaskBlockContext();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from("tasks")
      .select("id, title, status, deadline, task_assignments(profiles(full_name, avatar_url))")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setTasks(data as unknown as TaskRow[]);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Không thể cập nhật trạng thái");
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleAddTask = async () => {
    const title = newTitle.trim();
    if (!title || !groupId) return;

    setAdding(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Bạn cần đăng nhập");
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title,
      group_id: groupId,
      status: "TODO",
      created_by: userId,
    });

    if (error) {
      toast.error("Không thể tạo công việc");
    } else {
      setNewTitle("");
      await fetchTasks();
    }
    setAdding(false);
  };

  const handleDelete = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Xóa công việc "${taskTitle}"?`)) return;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      toast.error("Không thể xóa công việc");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
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

      {tasks.length === 0 && !editable && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2 bg-muted/30">
          <ListChecks className="h-6 w-6" />
          <p className="text-sm">Chưa có công việc nào trong dự án.</p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="divide-y">
          {tasks.map((task) => {
            const cfg = statusConfig[task.status] ?? statusConfig.TODO;
            const assignees = task.task_assignments
              ?.map((a) => a.profiles?.full_name)
              .filter(Boolean);

            return (
              <div
                key={task.id}
                className="group flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/30 transition-colors"
              >
                <span className="flex-1 truncate font-medium">{task.title}</span>

                {editable ? (
                  <Select
                    value={task.status}
                    onValueChange={(v) => handleStatusChange(task.id, v)}
                  >
                    <SelectTrigger className="h-6 w-auto min-w-[90px] text-xs px-2 py-0 border-none bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={cfg.variant} className="shrink-0 text-xs">
                    {cfg.label}
                  </Badge>
                )}

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

                {editable && (
                  <button
                    onClick={() => handleDelete(task.id, task.title)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editable && (
        <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/20">
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTask();
              }
            }}
            placeholder="Thêm công việc mới..."
            className="h-7 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 px-0"
            disabled={adding}
          />
        </div>
      )}
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
