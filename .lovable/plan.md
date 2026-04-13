

## Plan: Thêm tab Thành viên, Resources, Cài đặt cho trang Custom Project (/pa)

### Tóm tắt
Hiện tại `/pa` (custom mode) chỉ hiển thị `CanvasPageView` toàn màn hình, không có tab members/resources/settings. Cần mở rộng để custom mode cũng có navigation tabs như basic mode, với canvas là tab mặc định ("pages"), và thêm 3 tab: members, resources, settings.

### Changes

**File 1: `src/pages/GroupDetail.tsx`**
- Thay thế block `group.project_mode === 'custom'` (lines 506-509) — thay vì chỉ render `CanvasPageView`, bọc nó trong cùng hệ thống `Tabs` có điều kiện:
  - Tab `pages` (mặc định): render `CanvasPageView` như hiện tại
  - Tab `members`: render `MemberManagementCard` (giống basic mode, line 740)
  - Tab `resources`: render `ProjectResources` (giống basic mode, line 744)
  - Tab `settings` (chỉ leader/creator): render `ShareSettingsCard` + danger zone (giống basic mode, lines 773-809)
- Cập nhật `availableTabs` cho custom mode để bao gồm `pages, members, resources, settings`

**File 2: `src/components/layout/TopBar.tsx`**
- Cập nhật block `isCustomMode` (lines 91-116): thay vì chỉ hiển thị back button + tên project, hiển thị navigation tabs tương tự basic mode nhưng với tab set khác:
  - `pages` (icon FileText) — canvas editor
  - `members` (icon Users)
  - `resources` (icon FolderOpen)  
  - `settings` (icon Settings, chỉ leader/creator)
- Giữ lại back button ở bên trái

**File 3: `src/components/ProjectNavigation.tsx`** (nếu cần)
- Thêm tab `pages` vào danh sách tabs cho custom mode
- Hoặc tạo một set tabs riêng cho custom mode

### Technical Details
- Tab mặc định cho custom mode là `pages` thay vì `overview`
- `CanvasPageView` giữ nguyên `h-[calc(100vh-48px)]` khi ở tab `pages`
- Members, resources, settings tabs render trong container có padding giống basic mode
- `availableTabs` trong GroupDetail sẽ phân biệt theo `project_mode` để include đúng set tabs

