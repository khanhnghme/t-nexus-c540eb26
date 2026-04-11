export interface TaskRow {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  task_assignments: {
    profiles: { full_name: string; avatar_url: string | null } | null;
  }[];
}

export const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  TODO: { label: "Cần làm", variant: "outline" },
  IN_PROGRESS: { label: "Đang làm", variant: "secondary" },
  DONE: { label: "Hoàn thành", variant: "default" },
  VERIFIED: { label: "Đã duyệt", variant: "default" },
};

export const statusColumns = ["TODO", "IN_PROGRESS", "DONE", "VERIFIED"] as const;
export type TaskStatus = (typeof statusColumns)[number];

export interface TaskHandlers {
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onAdd: () => Promise<void>;
  onDelete: (taskId: string, taskTitle: string) => Promise<void>;
}
