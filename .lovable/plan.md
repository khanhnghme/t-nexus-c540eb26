

## Plan: Fix xóa Workspace/Project, hiện Dọn dẹp mọi lúc, cập nhật thống kê & nâng cấp popup xác nhận

### 1. Nguyên nhân gốc: Xóa Workspace không xóa Projects

**Bug**: Foreign key `groups_workspace_id_fkey` dùng `ON DELETE SET NULL` thay vì `ON DELETE CASCADE`. Khi xóa workspace, các project chỉ bị set `workspace_id = NULL` → vẫn tồn tại trong hệ thống.

**Fix**: 
- Migration: Đổi FK constraint thành `ON DELETE CASCADE`
- Edge function `delete_workspace`: Trước khi xóa workspace, xóa hết projects con (gồm tasks, files, members...) theo logic `deleteProject` đã có trong `AccountCleanupPanel`

### 2. Hiển thị tab Dọn dẹp mọi lúc

**Hiện tại**: `ServicePlan.tsx` dòng 191 & 494 chỉ render tab "Dọn dẹp" khi `accountLimits.isOverLimits === true`

**Fix**: Bỏ điều kiện `isOverLimits`, luôn hiển thị tab. Cập nhật mô tả trong `AccountCleanupPanel` cho phù hợp (không chỉ nói "giảm xuống hạn mức Free" mà nói "quản lý và dọn dẹp dữ liệu").

### 3. Cập nhật thống kê sau khi xóa

**Vấn đề**: Sau khi xóa workspace/project, các usage metrics (member count, project count) không refresh.

**Fix**:
- `WorkspaceSettings.tsx` → sau `handleDelete`, gọi `refreshWorkspaces()` (đã có) + navigate về dashboard
- `AccountCleanupPanel.tsx` → sau delete, gọi `refreshWorkspaces()` + `limits.refresh()` + `fetchData()` (đã có nhưng cần đảm bảo hoạt động đúng sau khi FK cascade fix)
- Đảm bảo `useAccountLimitsCheck` requery sau delete

### 4. Nâng cấp popup xác nhận — chuyên nghiệp hơn, dùng "đồng ý"

**Thay đổi tại 3 nơi**:

| Popup | Hiện tại | Sau khi sửa |
|-------|----------|-------------|
| **Xóa WS (WorkspaceSettings)** | Nhập tên workspace | Nhập `đồng ý`, diễn đạt chuyên nghiệp |
| **Dọn dẹp bước 1 (CleanupPanel)** | "Xem lại danh sách xóa" | "Xác nhận phạm vi xóa" — lời lẽ chuyên nghiệp |
| **Dọn dẹp bước 2 (CleanupPanel)** | Nhập `pricing` | Nhập `đồng ý`, diễn đạt chuyên nghiệp |

Nội dung popup mới sẽ:
- Dùng ngôn ngữ trang trọng, rõ ràng
- Nút xác nhận yêu cầu nhập từ **"đồng ý"**
- Cập nhật cả i18n EN (nhập **"agree"**)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | Đổi FK `groups_workspace_id_fkey` thành `ON DELETE CASCADE` |
| `supabase/functions/workspace-management/index.ts` | `delete_workspace` action: xóa projects con trước khi xóa workspace |
| `src/pages/ServicePlan.tsx` | Bỏ điều kiện `isOverLimits` cho tab Cleanup |
| `src/components/cleanup/AccountCleanupPanel.tsx` | Đổi confirm keyword `pricing` → `đồng ý`, viết lại diễn đạt popup, cập nhật mô tả panel |
| `src/pages/WorkspaceSettings.tsx` | Viết lại popup xác nhận xóa WS: nhập `đồng ý` thay vì tên workspace |
| `src/lib/i18n/en.ts` | Cập nhật chuỗi confirm xóa WS + cleanup (keyword: `agree`) |
| `src/lib/i18n/vi.ts` | Cập nhật chuỗi confirm xóa WS + cleanup (keyword: `đồng ý`) |

