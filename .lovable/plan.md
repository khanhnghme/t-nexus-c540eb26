

## Plan: Đổi Dashboard hiển thị 5 project sử dụng gần nhất

### Mô tả
Xóa toàn bộ bộ lọc (Active/Hidden/Pending/All, Basic/Custom) tại phần "My Projects" trên Dashboard. Thay bằng hiển thị tối đa 5 project được truy cập gần nhất, dựa trên bảng `project_access_log` (đã có sẵn trong DB với cột `accessed_at`).

### Thay đổi

#### `src/pages/Dashboard.tsx`

**Xóa:**
- State `filter`, `modeFilter` và `DashboardFilter`, `ProjectModeFilter` types
- `handleFilterChange`, localStorage logic cho filter
- `filteredGroups` useMemo với logic Active/Hidden/All/Pending + mode filter
- `activeCount`, `hiddenCount`, `pendingCount` computed values
- `useHiddenProjects` hook import và usage
- `usePendingApprovals` hook import và usage (phần pending approval groups hiển thị trong card)
- Toàn bộ ToggleGroup filter UI (desktop + mobile select)
- Phần hiển thị `pendingApprovalGroups` grid
- Import `ToggleGroup`, `ToggleGroupItem`, `EyeOff`, `Eye`, `Layers`, `Clock` (nếu không dùng nơi khác)
- Prop `onToggleHide` và `isHidden` khi render `DashboardProjectCard`

**Thêm:**
- Query `project_access_log` lấy 5 `group_id` gần nhất của user (sort by `accessed_at` desc, limit 5)
- Join với `groups` data đã có để lấy thông tin project
- Nếu `project_access_log` trống (user mới), fallback hiển thị 5 project mới nhất từ `groups`

**UI mới:**
- Header: "Dự án gần đây" / "Recent Projects" + nút "View all" → `/groups`
- Grid 5 project cards (giữ nguyên `DashboardProjectCard`, bỏ props `isHidden`/`onToggleHide`)
- Empty state đơn giản khi chưa có project nào

#### `src/hooks/useDashboardData.ts`
- Xóa `useHiddenProjects` export (không dùng nữa ở Dashboard)
- Xóa `usePendingApprovals` export (không dùng nữa ở Dashboard)
- Thêm `useRecentProjects(userId)` hook: query `project_access_log` order by `accessed_at` desc limit 5, rồi fetch groups data

#### i18n updates (`src/lib/i18n/en.ts`, `src/lib/i18n/vi.ts`)
- Thêm key `recentProjects` / `viewAll`
- Có thể xóa các key filter cũ không dùng nữa

### Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/pages/Dashboard.tsx` | Xóa filters, hiển thị 5 recent projects |
| 2 | `src/hooks/useDashboardData.ts` | Thêm `useRecentProjects` hook |
| 3 | `src/lib/i18n/en.ts` | Thêm keys mới |
| 4 | `src/lib/i18n/vi.ts` | Thêm keys mới |

**4 files. Không thêm dependencies.**

