import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, User, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import type { TaskRow, TaskHandlers, TaskStatus } from "./taskBlockTypes";
import { statusConfig, statusColumns } from "./taskBlockTypes";

interface TaskKanbanViewProps {
  tasks: TaskRow[];
  editable: boolean;
  newTitle: string;
  setNewTitle: (v: string) => void;
  adding: boolean;
  handlers: TaskHandlers;
}

export function TaskKanbanView({ tasks, editable, newTitle, setNewTitle, adding, handlers }: TaskKanbanViewProps) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      handlers.onStatusChange(taskId, newStatus);
    }
  }, [handlers]);

  const tasksByStatus = statusColumns.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<string, TaskRow[]>);

  return (
    <div className="grid grid-cols-4 gap-2 p-2 min-h-[120px]">
      {statusColumns.map((status) => {
        const cfg = statusConfig[status];
        const colTasks = tasksByStatus[status] || [];

        return (
          <div
            key={status}
            className={`flex flex-col rounded-lg border bg-muted/20 transition-colors ${
              dragOverCol === status ? "border-primary/50 bg-primary/5" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between px-2 py-1.5 border-b">
              <span className="text-xs font-medium truncate">{cfg.label}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {colTasks.length}
              </Badge>
            </div>

            <div className="flex-1 p-1.5 space-y-1.5 min-h-[60px]">
              {colTasks.map((task) => {
                const assignees = task.task_assignments
                  ?.map((a) => a.profiles?.full_name)
                  .filter(Boolean);

                return (
                  <div
                    key={task.id}
                    draggable={editable}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={`group rounded border bg-background p-2 text-xs shadow-sm transition-shadow ${
                      editable ? "cursor-grab active:cursor-grabbing hover:shadow-md" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-medium leading-tight line-clamp-2">{task.title}</span>
                      {editable && (
                        <button
                          onClick={() => handlers.onDelete(task.id, task.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                      {assignees && assignees.length > 0 && (
                        <span className="flex items-center gap-0.5 truncate max-w-[80px]">
                          <User className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{assignees[0]}</span>
                        </span>
                      )}
                      {task.deadline && (
                        <span className="flex items-center gap-0.5 shrink-0">
                          <Calendar className="h-2.5 w-2.5" />
                          {format(new Date(task.deadline), "dd/MM")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {editable && status === "TODO" && (
              <div className="flex items-center gap-1 px-1.5 py-1.5 border-t">
                <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handlers.onAdd();
                    }
                  }}
                  placeholder="Thêm..."
                  className="h-6 text-xs border-none bg-transparent shadow-none focus-visible:ring-0 px-0"
                  disabled={adding}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
