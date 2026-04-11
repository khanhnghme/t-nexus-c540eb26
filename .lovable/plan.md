

## Phase 4 — Task Table (Database View): Giai đoạn 2/4 (Logic)

Giai đoạn 1 đã hoàn thành: `useTaskTableData` (data fetching), `taskTableColumns` (column defs), `STATUS_CONFIG`. Giai đoạn 2 tập trung vào **hook quản lý table state** — sorting, filtering, pagination — sử dụng TanStack Table.

### Thay đổi

**1. Tạo `src/components/notion/task-table/useTaskTable.ts` — Table instance hook**
- Khởi tạo TanStack Table instance với `useReactTable`
- Tích hợp các features: `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`
- Nhận `data` từ `useTaskTableData` và `columns` từ `getTaskTableColumns`
- Quản lý state: `sorting`, `columnFilters`, `pagination`
- Export table instance + state setters để UI (giai đoạn 3-4) sử dụng

**2. Tạo `src/components/notion/task-table/useTaskTableFilters.ts` — Filter logic**
- Hook riêng cho filter logic: filter theo status, stage, assignee
- Hàm `getUniqueFilterValues` — trích xuất unique values từ data cho filter dropdowns
- Hàm `applyStatusFilter`, `applyStageFilter` — set column filters trên table instance

**3. Update `index.ts` — Thêm exports mới**

### Không thay đổi database
### Không thay đổi UI rendering (giai đoạn 3-4)

### Files cần tạo/sửa

| File | Thay đổi |
|------|----------|
| `src/components/notion/task-table/useTaskTable.ts` | **Tạo mới** — Table instance hook với sorting/pagination |
| `src/components/notion/task-table/useTaskTableFilters.ts` | **Tạo mới** — Filter logic helper |
| `src/components/notion/task-table/index.ts` | Thêm exports mới |

