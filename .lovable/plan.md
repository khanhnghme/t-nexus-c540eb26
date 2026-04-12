

## Fix: Dashboard UI khi chưa có workspace

### Vấn đề
Nút "View & Create Project" (line 964-970) luôn dẫn đến `/groups` bất kể user có workspace hay chưa. Khi chưa có workspace, user không thể tạo project → gây nhầm lẫn.

### Giải pháp

**File: `src/pages/Dashboard.tsx`**

1. **Nút "View & Create Project"**: Khi `!activeWorkspace`, đổi thành nút "Create Workspace" dẫn đến `/workspace/new` thay vì `/groups`
2. **Empty state khi chưa có project + chưa có workspace**: Hiển thị thông báo "Bạn cần tạo Workspace trước khi có thể tạo project" + nút CTA tạo workspace, thay vì "Contact Leader"
3. **Giữ nguyên logic** khi đã có workspace → hoạt động như cũ

**Thay đổi cụ thể:**

- Line 964-970: Wrap trong điều kiện `activeWorkspace` — nếu có thì giữ nguyên link `/groups`, nếu không thì hiện nút "Create Workspace" → `/workspace/new`
- Line 993-1002 (empty state): Thêm case khi `!activeWorkspace` hiển thị CTA tạo workspace thay vì "Contact Leader"

| File | Thay đổi |
|------|----------|
| `src/pages/Dashboard.tsx` | Cập nhật nút CTA + empty state theo trạng thái workspace |

