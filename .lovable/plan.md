

## Phase 4 — Task Table (Database View): Giai đoạn 3/4 (UI Design & Build)

Giai đoạn 1-2 đã hoàn thành: `useTaskTableData`, `taskTableColumns`, `useTaskTable` (sorting/filter/pagination), `useTaskTableFilters`. Giai đoạn 3 tập trung vào **build UI component** cho task table.

### Thay đổi

**1. Tạo `src/components/notion/task-table/TaskTable.tsx` — Main table component**
- Sử dụng `useTaskTable` hook để lấy table instance
- Render table bằng `flexRender` từ TanStack + shadcn `Table` components
- Hiển thị: header row với sort indicators, body rows với data cells
- Status column render badge với màu từ `STATUS_CONFIG`
- Assignees column render avatar stack (avatar circle + fallback initials)
- Loading state với skeleton rows
- Empty state khi không có data
- Notion-style styling: border nhẹ, hover highlight, compact rows

**2. Tạo `src/components/notion/task-table/TaskTableToolbar.tsx` — Filter bar**
- Thanh toolbar phía trên table
- Filter dropdown cho Status (sử dụng `applyStatusFilter`)
- Filter dropdown cho Stage (sử dụng `applyStageFilter`)
- Hiển thị active filter badges với nút clear
- Sử dụng `useTaskTableFilters` để lấy unique values cho dropdowns

**3. Tạo `src/components/notion/task-table/TaskTablePagination.tsx` — Pagination controls**
- Hiển thị "Showing X of Y" text
- Nút Previous / Next page
- Sử dụng `table.getCanPreviousPage()`, `table.getCanNextPage()`

**4. Update `index.ts` — Thêm exports UI components**

### Không thay đổi database
### Không thay đổi logic hooks (đã hoàn thành ở giai đoạn 1-2)

### Files cần tạo/sửa

| File | Thay đổi |
|------|----------|
| `src/components/notion/task-table/TaskTable.tsx` | **Tạo mới** — Main table UI |
| `src/components/notion/task-table/TaskTableToolbar.tsx` | **Tạo mới** — Filter toolbar |
| `src/components/notion/task-table/TaskTablePagination.tsx` | **Tạo mới** — Pagination UI |
| `src/components/notion/task-table/index.ts` | Thêm exports mới |

