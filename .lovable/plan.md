

## Plan: Đổi Projects thành section riêng với 3 link filter

### Mô tả
Thay thế phần Projects dạng accordion (xổ danh sách project) thành section riêng giống "PERSONAL", với 3 link điều hướng đến trang `/groups` kèm query param filter.

### Thay đổi

#### 1. `src/components/SidebarTreeNav.tsx`
- **Xóa** toàn bộ accordion Projects (button toggle + tree-children liệt kê project)
- **Thêm** section "PROJECTS" mới (tương tự section PERSONAL) với 3 link:
  - `All projects` → `/groups?filter=all` (icon: FolderKanban)
  - `Created by me` → `/groups?filter=created` (icon: FolderOpen)
  - `Shared with me` → `/groups?filter=shared` (icon: Users)
- Collapsed mode: 1 icon FolderKanban duy nhất → `/groups`
- Xóa dependency `useWorkspaceProjects`, `hiddenIds`, `visibleProjects`, `MAX_SIDEBAR_PROJECTS` (không cần nữa)

#### 2. `src/pages/Groups.tsx`
- Đọc `searchParams.get('filter')` từ URL
- Dựa vào filter value:
  - `all` (default): hiện tất cả projects trong workspace hiện tại (giữ nguyên logic hiện tại)
  - `created`: filter `groups` where `created_by === user.id` trong workspace hiện tại
  - `shared`: hiện projects user là member nhưng không phải creator, across tất cả workspaces
- Thêm tab/toggle UI ở đầu trang để user có thể chuyển giữa 3 filter mà không cần quay lại sidebar

### Sidebar layout mới

```text
── HOME
── SEARCH
── NOTIFICATIONS
── AI ASSISTANT
─────────────
PROJECTS
  All projects
  Created by me
  Shared with me
─────────────
PERSONAL
  Calendar
  Communication
  ...
```

### Files thay đổi

| # | File | Thay đổi |
|---|------|----------|
| 1 | `SidebarTreeNav.tsx` | Xóa accordion, thêm 3 link filter |
| 2 | `Groups.tsx` | Đọc `?filter=` param, filter data theo giá trị |

**2 files. Không thêm dependencies.**

