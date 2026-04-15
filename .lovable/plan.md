

## Fix: Recent Projects tính trên mọi Workspace + thêm tooltip giải thích

### Vấn đề
`useRecentProjects` hiện nhận `allGroups` từ `useDashboardData` — dữ liệu này đã bị lọc theo workspace hiện tại. Nên "Dự án gần đây" chỉ hiển thị project trong workspace đang chọn.

### Giải pháp

#### 1. `src/hooks/useDashboardData.ts` — Sửa `fetchRecentProjectsFn`
- Bỏ dependency vào `allGroups` parameter
- Query trực tiếp: lấy 5 `group_id` mới nhất từ `project_access_log`, rồi fetch groups tương ứng từ bảng `groups` (không filter workspace)
- Fallback: nếu không có access log, lấy 5 project mới nhất user là member (không filter workspace)
- Cập nhật signature `useRecentProjects(userId)` — bỏ param `allGroups`

#### 2. `src/pages/Dashboard.tsx`
- Cập nhật lời gọi: `useRecentProjects(user?.id)` (bỏ `groups`)
- Thêm icon `HelpCircle` (dấu ?) cạnh tiêu đề "Dự án gần đây"
- Bọc trong `Tooltip` hiển thị giải thích:
  - VI: "Hiển thị 5 dự án bạn truy cập gần nhất trên tất cả workspace, không giới hạn workspace hiện tại"
  - EN: "Shows the 5 most recently accessed projects across all workspaces, not limited to the current one"

#### 3. i18n (`src/lib/i18n/en.ts`, `src/lib/i18n/vi.ts`)
- Thêm key `recentProjectsTooltip` cho nội dung tooltip

### Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/hooks/useDashboardData.ts` | Sửa `fetchRecentProjectsFn` query cross-workspace |
| 2 | `src/pages/Dashboard.tsx` | Bỏ param `groups`, thêm Tooltip dấu ? |
| 3 | `src/lib/i18n/en.ts` | Thêm `recentProjectsTooltip` |
| 4 | `src/lib/i18n/vi.ts` | Thêm `recentProjectsTooltip` |

**4 files. Không thêm dependencies.**

