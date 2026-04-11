

## Phase 5 — Kanban Board + Task Detail Enhancement + Project Calendar: Giai đoạn 1/4 (Database)

Phase 4 hoàn thành: Task Table (Database View). Phase 5 kết hợp 3 tính năng: **(1) Kanban Board**, **(2) Task Detail Enhancement**, **(3) Calendar View tích hợp vào project**.

### Đánh giá Database

**Kanban Board**: Không cần thay đổi database. Bảng `tasks` đã có cột `status` (TODO, IN_PROGRESS, DONE, VERIFIED) — đủ để làm các cột Kanban. Việc kéo thả card chỉ cần `UPDATE tasks SET status = ?`.

**Task Detail Enhancement**: Bảng `task_comments` đã tồn tại với đầy đủ cấu trúc (parent_id cho threaded replies). Tuy nhiên cần thêm:
- Bảng `task_attachments` — cho phép đính kèm file vào task (hiện chưa có bảng này)

**Calendar View trong project**: Không cần thay đổi database. Trang Calendar (`/calendar`) đã tồn tại, chỉ cần embed một phiên bản filtered theo `group_id` vào project detail.

### Thay đổi Database

**1. Tạo bảng `task_attachments`**
- `id` (uuid, PK)
- `task_id` (uuid, FK → tasks.id ON DELETE CASCADE)
- `user_id` (uuid, FK — người upload)
- `file_name` (text)
- `file_path` (text — storage path)
- `file_size` (bigint)
- `storage_name` (text — bucket name)
- `content_type` (text — MIME type)
- `created_at` (timestamptz)

**2. RLS policies cho `task_attachments`**
- SELECT: group members có thể xem attachments của tasks trong group mình
- INSERT: group members có thể upload (user_id = auth.uid())
- DELETE: uploader hoặc group leader có thể xóa

**3. Storage bucket** (nếu chưa có)
- Tạo bucket `task-attachments` cho file storage

### Không thay đổi

- Bảng `tasks` — đã có status, deadline, submission_link
- Bảng `task_comments` — đã có threaded comments
- Bảng `task_assignments` — đã có

### Giai đoạn tiếp theo (preview)

- **Giai đoạn 2/4 (Logic)**: Hook useKanbanBoard (drag state, status update), useTaskAttachments (upload/delete), useProjectCalendar (filter events by groupId)
- **Giai đoạn 3/4 (UI)**: KanbanBoard component, TaskDetailPanel (enhanced), ProjectCalendarView
- **Giai đoạn 4/4 (Integration)**: Tích hợp vào GroupDetail tabs, i18n, responsive

### Migration SQL

```sql
-- task_attachments table
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  storage_name text NOT NULL DEFAULT 'task-attachments',
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: group members
CREATE POLICY "Group members can view task attachments"
ON public.task_attachments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks t
  JOIN group_members gm ON gm.group_id = t.group_id
  WHERE t.id = task_attachments.task_id
    AND gm.user_id = auth.uid()
));

-- INSERT: group members, own user_id
CREATE POLICY "Group members can upload task attachments"
ON public.task_attachments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN group_members gm ON gm.group_id = t.group_id
    WHERE t.id = task_attachments.task_id
      AND gm.user_id = auth.uid()
  )
);

-- DELETE: uploader or group leader
CREATE POLICY "Uploader or leader can delete task attachments"
ON public.task_attachments FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_attachments.task_id
      AND is_group_leader(auth.uid(), t.group_id)
  )
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Group members can upload task attachment files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Group members can view task attachment files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can delete own task attachment files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### Files cần thay đổi

| File | Thay đổi |
|------|----------|
| Database migration | Tạo bảng `task_attachments` + RLS + storage bucket |

