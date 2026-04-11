

## Phase 4 — Task Table (Database View): Giai đoạn 1/4 (Database)

Phase 3 hoàn thành: Slash commands & editor customization. Phase 4 tập trung vào **hiển thị tasks dạng table giống Notion** bằng TanStack Table, map với data task hiện tại.

### Đánh giá Database

Phase này **không cần thay đổi database**. Bảng `tasks` đã có đầy đủ các cột cần thiết: `title`, `status`, `deadline`, `stage_id`, `created_at`, `submission_method`, `is_hidden`. Các bảng liên quan (`task_assignments`, `stages`, `task_scores`) cũng đã tồn tại.

### Thay đổi

**1. Cài đặt `@tanstack/react-table`**
- Thêm dependency `@tanstack/react-table` vào `package.json`
- Đây là thư viện headless table — chỉ logic, không có UI built-in

**2. Tạo `src/components/notion/task-table/useTaskTableData.ts` — Hook lấy data**
- Query `tasks` theo `group_id` từ context project hiện tại
- Join với `task_assignments` để lấy assignees
- Join với `stages` để lấy stage name
- Join với `task_scores` để lấy điểm (nếu có)
- Return typed data array + loading state

**3. Tạo `src/components/notion/task-table/taskTableColumns.ts` — Column definitions**
- Define column defs cho TanStack Table:
  - Title (text)
  - Status (badge với màu theo enum `task_status`)
  - Assignees (avatar list)
  - Deadline (date format)
  - Stage (text)
  - Submission method (text)
- Type-safe column definitions sử dụng `createColumnHelper`

**4. Tạo `src/components/notion/task-table/index.ts` — Barrel export**
- Export `useTaskTableData`, `taskTableColumns`

### Chưa làm trong giai đoạn này
- Render UI table component (giai đoạn 3-4)
- Tích hợp vào BlockNote editor dạng custom block (Phase 5)
- Sort/filter UI (giai đoạn 3-4)

### Files cần tạo

| File | Thay đổi |
|------|----------|
| `package.json` | Thêm `@tanstack/react-table` |
| `src/components/notion/task-table/useTaskTableData.ts` | **Tạo mới** — Hook query tasks |
| `src/components/notion/task-table/taskTableColumns.ts` | **Tạo mới** — Column definitions |
| `src/components/notion/task-table/index.ts` | **Tạo mới** — Barrel export |

