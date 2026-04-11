

## Phase 4 — Task Table (Database View): Giai đoạn 4/4 (Final Polish & Integration)

Giai đoạn 1-3 đã hoàn thành: data hooks, table logic, UI components. Giai đoạn 4 tập trung vào **tích hợp vào page thực tế, i18n, và polish cuối**.

### Thay đổi

**1. Tích hợp `TaskTable` vào `GroupDetail.tsx`**
- Thêm một tab mới hoặc toggle view trong tab `tasks` hiện tại để chuyển giữa `TaskListView` (view hiện tại) và `TaskTable` (database view mới)
- Thêm nút toggle icon (list view / table view) vào toolbar của tab tasks
- Truyền `groupId={group.id}` cho `TaskTable`

**2. I18n — Thêm translations cho task table**
- `src/lib/i18n/vi.ts`: Thêm key `taskTable` với các label: Title → "Tên task", Status → "Trạng thái", Assignees → "Người thực hiện", Deadline → "Hạn nộp", Stage → "Giai đoạn", Submission → "Hình thức nộp", showing/filtered/clear/noTasks
- `src/lib/i18n/en.ts`: Thêm tương tự bằng tiếng Anh
- Update `taskTableColumns.ts` để nhận translations thay vì hardcoded strings
- Update `TaskTableToolbar.tsx` và `TaskTablePagination.tsx` sử dụng i18n

**3. Polish UI**
- `TaskTable.tsx`: Thêm row click handler để navigate tới task detail (`/p/{slug}/t/{taskSlug}`)
- `TaskTableToolbar.tsx`: Thêm search input filter theo title
- Responsive: ẩn một số cột trên mobile (submission_method, stage_name)

**4. Dark mode verification**
- Đảm bảo `STATUS_CONFIG` colors hoạt động tốt trên cả light/dark mode
- Kiểm tra border, hover states trong dark mode

### Không thay đổi database

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/pages/GroupDetail.tsx` | Tích hợp TaskTable với view toggle |
| `src/lib/i18n/vi.ts` | Thêm taskTable translations |
| `src/lib/i18n/en.ts` | Thêm taskTable translations |
| `src/components/notion/task-table/taskTableColumns.ts` | Sử dụng i18n cho header labels |
| `src/components/notion/task-table/TaskTable.tsx` | Row click, responsive, i18n |
| `src/components/notion/task-table/TaskTableToolbar.tsx` | Search input, i18n |
| `src/components/notion/task-table/TaskTablePagination.tsx` | i18n text |

