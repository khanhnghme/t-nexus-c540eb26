

## Phase 5 — Kanban + Task Attachments + Project Calendar: Giai đoạn 2/4 (Logic)

Giai đoạn 1 đã hoàn thành: bảng `task_attachments` + RLS + storage bucket `task-attachments`. Giai đoạn 2 tập trung vào **logic hooks** cho 3 tính năng.

### Thay đổi

**1. Tạo `src/hooks/useKanbanBoard.ts` — Kanban drag & drop logic**
- Nhận `groupId`, fetch tasks từ Supabase (id, title, status, deadline, assignees, stage_name)
- Nhóm tasks theo status thành 4 cột: TODO, IN_PROGRESS, DONE, VERIFIED
- Hàm `moveTask(taskId, newStatus)` — update status trong DB + optimistic update qua `queryClient.setQueryData`
- Hàm `getColumnTasks(status)` — trả về danh sách tasks cho mỗi cột
- Sử dụng `useQuery` + `useMutation` từ TanStack Query
- Re-use `TaskTableRow` type từ `useTaskTableData` hoặc define simplified `KanbanTask` type

**2. Tạo `src/hooks/useTaskAttachments.ts` — File attachment CRUD**
- Nhận `taskId`
- `useQuery` fetch attachments từ `task_attachments` table (join profiles cho uploader info)
- `uploadAttachment(file: File)` — upload file lên storage bucket `task-attachments` (path: `{userId}/{taskId}/{fileName}`), insert record vào `task_attachments`
- `deleteAttachment(attachmentId, filePath)` — xóa record + xóa file từ storage
- `getDownloadUrl(filePath)` — tạo signed URL hoặc public URL
- Trả về `{ attachments, isLoading, uploadAttachment, deleteAttachment, isUploading }`

**3. Tạo `src/hooks/useProjectCalendar.ts` — Calendar events filtered by project**
- Nhận `groupId`
- Re-use logic từ `Calendar.tsx` (line 52-99) nhưng filter chỉ theo 1 `groupId` thay vì tất cả groups
- Fetch tasks có deadline thuộc group đó, map thành `CalendarEvent[]`
- Fetch personal events của user (optional, có thể bỏ cho project calendar)
- Trả về `{ events, isLoading, refetch }`

### Chi tiết kỹ thuật

- Tất cả hooks sử dụng `useAuth()` cho user context
- Sử dụng `useReadOnlyGuard()` cho mutation actions (upload, delete, moveTask)
- Query keys pattern: `['kanban', groupId]`, `['task-attachments', taskId]`, `['project-calendar', groupId]`
- `useKanbanBoard` invalidate cả `['task-table', groupId]` khi move task để sync với Task Table view

### Không thay đổi database
### Không thay đổi UI (giai đoạn 3-4)

### Files cần tạo

| File | Thay đổi |
|------|----------|
| `src/hooks/useKanbanBoard.ts` | **Tạo mới** — Kanban state + moveTask mutation |
| `src/hooks/useTaskAttachments.ts` | **Tạo mới** — Attachment CRUD + storage |
| `src/hooks/useProjectCalendar.ts` | **Tạo mới** — Calendar events by groupId |

