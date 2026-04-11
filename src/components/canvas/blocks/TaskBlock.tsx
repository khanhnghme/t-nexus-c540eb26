import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTaskBlockContext } from "./TaskBlockContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import type { TaskRow, TaskHandlers, TaskStatus } from "./taskBlockTypes";
import { TaskListView } from "./TaskListView";
import { TaskKanbanView } from "./TaskKanbanView";

function TaskListRenderer() {
  const { groupId, editable } = useTaskBlockContext();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

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

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
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
  }, []);

  const handleAddTask = useCallback(async (params?: { title?: string; assigneeId?: string; deadline?: string }) => {
    const title = (params?.title || newTitle).trim();
    if (!title || !groupId) return;

    setAdding(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Bạn cần đăng nhập");
      setAdding(false);
      return;
    }

    const { data: taskData, error } = await supabase.from("tasks").insert({
      title,
      group_id: groupId,
      status: "TODO",
      created_by: userId,
      deadline: params?.deadline || null,
    }).select("id").single();

    if (error || !taskData) {
      toast.error("Không thể tạo công việc");
    } else {
      if (params?.assigneeId) {
        await supabase.from("task_assignments").insert({
          task_id: taskData.id,
          user_id: params.assigneeId,
          assigned_by: userId,
        });
      }
      setNewTitle("");
      await fetchTasks();
    }
    setAdding(false);
  }, [newTitle, groupId, fetchTasks]);

  const handleDelete = useCallback(async (taskId: string, taskTitle: string) => {
    if (!confirm(`Xóa công việc "${taskTitle}"?`)) return;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      toast.error("Không thể xóa công việc");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleUpdateTitle = useCallback(async (taskId: string, newTitle: string) => {
    const title = newTitle.trim();
    if (!title) return;
    const { error } = await supabase.from("tasks").update({ title }).eq("id", taskId);
    if (error) {
      toast.error("Không thể cập nhật tiêu đề");
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title } : t)));
  }, []);

  const handleUpdateDeadline = useCallback(async (taskId: string, newDeadline: string | null) => {
    const { error } = await supabase.from("tasks").update({ deadline: newDeadline }).eq("id", taskId);
    if (error) {
      toast.error("Không thể cập nhật deadline");
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, deadline: newDeadline } : t)));
  }, []);

  const handlers: TaskHandlers = useMemo(() => ({
    onStatusChange: handleStatusChange,
    onAdd: handleAddTask,
    onDelete: handleDelete,
    onUpdateTitle: handleUpdateTitle,
    onUpdateDeadline: handleUpdateDeadline,
  }), [handleStatusChange, handleAddTask, handleDelete, handleUpdateTitle, handleUpdateDeadline]);

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
        <div className="flex items-center border rounded-md overflow-hidden ml-1">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1 transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Danh sách"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`p-1 transition-colors ${viewMode === "kanban" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Kanban"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <TaskListView
          tasks={tasks}
          editable={editable}
          groupId={groupId}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          adding={adding}
          handlers={handlers}
        />
      ) : (
        <TaskKanbanView
          tasks={tasks}
          editable={editable}
          groupId={groupId}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          adding={adding}
          handlers={handlers}
        />
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
