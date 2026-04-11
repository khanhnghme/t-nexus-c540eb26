import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, User, Trash2, Plus, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { TaskRow, TaskHandlers } from "./taskBlockTypes";
import { statusConfig } from "./taskBlockTypes";

interface TaskListViewProps {
  tasks: TaskRow[];
  editable: boolean;
  newTitle: string;
  setNewTitle: (v: string) => void;
  adding: boolean;
  handlers: TaskHandlers;
}

export function TaskListView({ tasks, editable, newTitle, setNewTitle, adding, handlers }: TaskListViewProps) {
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

  if (tasks.length === 0 && !editable) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2 bg-muted/30">
        <ListChecks className="h-6 w-6" />
        <p className="text-sm">Chưa có công việc nào trong dự án.</p>
      </div>
    );
  }

  return (
    <>
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
                    className="flex-1 h-7 text-sm border-none bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 px-1"
                  />
                ) : (
                  <span
                    className={cn("flex-1 truncate font-medium", editable && "cursor-pointer hover:text-primary")}
                    onClick={() => editable && startEditTitle(task)}
                  >
                    {task.title}
                  </span>
                )}

                {editable ? (
                  <Select
                    value={task.status}
                    onValueChange={(v) => handlers.onStatusChange(task.id, v as "TODO" | "IN_PROGRESS" | "DONE" | "VERIFIED")}
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

                {editable ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0 hover:text-primary transition-colors">
                        <Calendar className="h-3 w-3" />
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
                    <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.deadline), "dd/MM")}
                    </span>
                  )
                )}

                {editable && (
                  <button
                    onClick={() => handlers.onDelete(task.id, task.title)}
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
                handlers.onAdd();
              }
            }}
            placeholder="Thêm công việc mới..."
            className="h-7 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 px-0"
            disabled={adding}
          />
        </div>
      )}
    </>
  );
}
