

## Thêm bộ lọc cho Dashboard (project mode) và trang Groups

### Thay đổi

| File | Nội dung |
|------|----------|
| `src/pages/Dashboard.tsx` | Thêm filter `project_mode` (Tất cả / Basic / Custom) vào thanh ToggleGroup hiện có. Áp dụng filter lên `filteredGroups`. |
| `src/pages/Groups.tsx` | Thêm thanh filter phía trên danh sách project: ô tìm kiếm theo tên + filter theo project mode (Tất cả / Basic / Custom) + filter theo visibility (Tất cả / Private / WS Public / Public). Lọc `groups` trước khi render grid. |

### Chi tiết

**Dashboard.tsx:**
- Thêm state `projectModeFilter`: `'all' | 'basic' | 'custom'`
- Thêm 3 toggle items (Tất cả / Basic / Custom) bên cạnh filter active/hidden/all hiện có, ngăn cách bằng divider
- Trong `filteredGroups` useMemo, thêm bước lọc theo `project_mode` nếu không phải `'all'`

**Groups.tsx:**
- Thêm state: `searchQuery` (string), `modeFilter` (`'all' | 'basic' | 'custom'`), `visibilityFilter` (`'all' | 'private' | 'workspace_public' | 'public_link'`)
- Thêm `filteredGroups` useMemo lọc theo 3 tiêu chí trên
- Render thanh filter giữa phần header/dialog và grid danh sách: Input search + 2 Select dropdown (Mode, Visibility)
- Thay `groups.map` bằng `filteredGroups.map` trong grid render
- Thay `groups.length === 0` bằng logic kiểm tra cả `groups` gốc lẫn `filteredGroups`

