import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { TaskRow, TaskHandlers, TaskStatus } from "./taskBlockTypes";
import { statusConfig, statusColumns } from "./taskBlockTypes";
import { InlineTaskCreator } from "./InlineTaskCreator";
import { useIsMobile } from "@/hooks/use-mobile";

interface TaskKanbanViewProps {
  tasks: TaskRow[];
  editable: boolean;
  groupId: string;
  newTitle: string;
  setNewTitle: (v: string) => void;
  adding: boolean;
  handlers: TaskHandlers;
}

export function TaskKanbanView({ tasks, editable, groupId, newTitle, setNewTitle, adding, handlers }: TaskKanbanViewProps) {
  const isMobile = useIsMobile();
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  const startEditTitle = (task: TaskRow) => {
    setEditingTitleId(task.id);
    setEditingTitleValue(task.title);
  };

  const saveTitle = (taskId: string) => {
    const trimmed = editingTitleValue.trim();
    if (trimmed && trimmed !== tasks.find((t) => t.id === taskId)?.title) {
      handlers.onUpdateTitle(taskId, trimmed);
    }
    setEditingTitleId(null);
  };

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
    <div className={cn(
      "gap-2 p-2 min-h-[120px]",
      isMobile ? "flex flex-col" : "grid grid-cols-4"
    )}>
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
                    draggable={editable && editingTitleId !== task.id}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={`group rounded border bg-background p-2 text-xs shadow-sm transition-shadow ${
                      editable ? "cursor-grab active:cursor-grabbing hover:shadow-md" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      {editable && editingTitleId === task.id ? (
                        <Input
                          value={editingTitleValue}
                          onChange={(e) => setEditingTitleValue(e.target.value)}
                          onBlur={() => saveTitle(task.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); saveTitle(task.id); }
                            if (e.key === "Escape") setEditingTitleId(null);
                          }}
                          autoFocus
                          className="flex-1 h-5 text-xs border-none bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 px-0"
                        />
                      ) : (
                        <span
                          className={cn("font-medium leading-tight line-clamp-2", editable && "cursor-pointer hover:text-primary")}
                          onClick={() => editable && startEditTitle(task)}
                        >
                          {task.title}
                        </span>
                      )}
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
                      {editable ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-0.5 shrink-0 hover:text-primary transition-colors">
                              <Calendar className="h-2.5 w-2.5" />
                              {task.deadline ? format(new Date(task.deadline), "dd/MM") : "Hạn"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={task.deadline ? new Date(task.deadline) : undefined}
                              onSelect={(date) => {
                                handlers.onUpdateDeadline(task.id, date ? date.toISOString() : null);
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        task.deadline && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            <Calendar className="h-2.5 w-2.5" />
                            {format(new Date(task.deadline), "dd/MM")}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {editable && status === "TODO" && (
              <InlineTaskCreator
                groupId={groupId}
                adding={adding}
                onAdd={handlers.onAdd}
                compact
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
