

## Plan: Breadcrumb editable để đổi tên Project custom (/pa)

### Cách hoạt động
Thêm tên project dưới dạng breadcrumb editable trên TopBar cho custom mode. Khi ở trang `/pa`, hiển thị: **Dự án / Tên Project ✏️**. Click vào tên → chuyển thành input → Enter để lưu, Escape để hủy. Chỉ leader/admin mới được sửa, thành viên thường chỉ thấy text.

### Changes

**File 1: `src/contexts/DashboardLayoutContext.tsx`**
- Thêm `onRenameProject?: (newName: string) => void` vào `ProjectNavProps`
- Cho phép TopBar gọi callback rename mà không cần biết logic Supabase

**File 2: `src/pages/GroupDetail.tsx`**
- Tạo hàm `handleRenameProject(newName)`: update `groups.name` qua Supabase, gọi `fetchGroupData()`, log activity
- Truyền `onRenameProject` vào `setProjectNavProps`

**File 3: `src/components/layout/TopBar.tsx`**
- Khi `isCustomMode && isProjectMode`: thay vì chỉ hiển thị tabs, thêm breadcrumb bên trái (trước back button hoặc sau):
  ```
  Dự án / [Tên Project ✏️]  |  📄 Trang  👥 Thành viên  📁 Tài nguyên  ⚙️ Cài đặt
  ```
- Click vào tên → state `editingName=true` → render `<input>` inline
- Enter → gọi `projectNavProps.onRenameProject(newName)`, reset state
- Escape → hủy, quay lại text
- Chỉ cho phép edit khi `projectNavProps.isLeaderInGroup === true`
- Text style: `font-medium text-foreground`, hover hiện underline dashed + cursor-text

### Technical Details
- Rename update: `supabase.from('groups').update({ name }).eq('id', groupId)`
- Debounce không cần (chỉ commit khi Enter/blur)
- Breadcrumb "Dự án" là Link to `/groups`
- Trên mobile (viewport nhỏ): ẩn breadcrumb prefix "Dự án /", chỉ hiện tên project

