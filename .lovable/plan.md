

## Phase 5 — Giai đoạn 1/4: Custom Block `/task` — Khung Custom Block + Hiển thị danh sách task (Read-only)

### Bối cảnh
Phase 1-4 đã hoàn thành nền tảng canvas editor: BlockNote, auto-save, mode selector, multi-page sidebar. Giờ bắt đầu xây dựng **interactive custom blocks** — bắt đầu với `/task` block, cho phép chèn danh sách công việc trực tiếp vào canvas.

Giai đoạn 1/4 tập trung thiết lập **custom block infrastructure** trong BlockNote và render danh sách tasks **read-only** từ DB.

### Mục tiêu
- Thiết lập cơ chế custom block trong BlockNote (schema, slash menu)
- Gõ `/task` trong editor → chèn block hiển thị danh sách tasks của project
- Hiển thị: title, status badge, assignee, deadline
- Chỉ đọc trong giai đoạn này (chưa có CRUD từ block)

### Hành động cụ thể

**1. Tạo `src/components/canvas/blocks/TaskBlock.tsx`**
- Dùng `createReactBlockSpec` từ `@blocknote/react` để đăng ký custom block type `"taskList"`
- Block nhận `groupId` từ context (React Context hoặc prop drilling qua editor)
- Fetch tasks từ `tasks` table theo `group_id` (dùng supabase client)
- Render bảng nhỏ gọn: Title | Status badge | Assignee avatar | Deadline
- Hiển thị loading skeleton khi đang fetch
- Empty state khi chưa có task

**2. Tạo `src/components/canvas/blocks/TaskBlockContext.tsx`**
- React Context cung cấp `groupId` và `editable` cho custom blocks
- Wrap `BlockNoteView` trong context provider

**3. Cập nhật `src/components/canvas/CanvasEditor.tsx`**
- Import custom block schema, tạo `BlockNoteSchema` với `taskList` block
- Đăng ký slash menu item `/task` với label "Danh sách công việc"
- Wrap editor trong `TaskBlockContext.Provider`
- Truyền `groupId` vào editor component (thêm prop)

**4. Cập nhật `src/components/canvas/CanvasPageView.tsx`**
- Truyền `groupId` xuống `CanvasEditor`

### Không làm trong giai đoạn này
- CRUD task từ block (giai đoạn 2)
- Kanban view toggle (giai đoạn 3)
- Inline task creation (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/TaskBlock.tsx` | **Mới** — Custom block hiển thị task list |
| `src/components/canvas/blocks/TaskBlockContext.tsx` | **Mới** — Context cung cấp groupId cho blocks |
| `src/components/canvas/CanvasEditor.tsx` | Tích hợp custom schema + slash menu + context |
| `src/components/canvas/CanvasPageView.tsx` | Truyền groupId xuống editor |

### Chi tiết kỹ thuật

```text
BlockNote Custom Block Flow:
  
  createReactBlockSpec("taskList")
    └─ render: <TaskListRenderer groupId={context.groupId} />
         └─ useEffect → supabase.from("tasks").select("*").eq("group_id", groupId)
              └─ Table UI: title | status | assignee | deadline

  Slash Menu:
    "/" → "Danh sách công việc" → insertBlock({ type: "taskList" })
```

### Rủi ro
- BlockNote custom block API cần `blockSchema` được define lúc tạo editor — phải restructure `useCreateBlockNote` call
- Custom block content không nằm trong JSONB auto-save (chỉ lưu block type marker, data thật nằm trong `tasks` table)

