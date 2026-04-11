

## Phase 1 — Giai đoạn 4/4: Tích hợp trang test vào layout + Polish UI

### Mục tiêu
Hoàn thiện trang `/create-custom` để sẵn sàng cho Phase 2 (lưu DB). Đảm bảo trang nằm trong layout chính, có breadcrumb/navigation, và editor UI được polish.

### Hiện trạng
- ✅ Giai đoạn 1: DB slug column + trigger
- ✅ Giai đoạn 2: RLS policies bổ sung
- ✅ Giai đoạn 3: BlockNote installed, CanvasEditor component, route `/create-custom`
- ❌ Trang `/create-custom` hiện tại rất bare-bones: chỉ có Input + Editor, không có layout wrapper, không có nút tạo project, không có workspace selector

### Hành động cụ thể

**1. Wrap trang trong ProtectedLayout (nếu chưa có)**
- Kiểm tra route trong App.tsx đã nằm trong ProtectedLayout chưa → đảm bảo user phải đăng nhập
- Thêm breadcrumb: Home → Create Custom Project

**2. Nâng cấp `CreateCustomProject.tsx`**
- Thêm workspace selector dropdown (chọn workspace để tạo project vào)
- Thêm description textarea (optional)
- Thêm nút "Tạo dự án" (disabled khi chưa nhập tên)
- Nút chưa kết nối DB — chỉ console.log payload để verify data flow
- Thêm nút "Quay lại" / Cancel
- Layout: 2 phần — sidebar trái (metadata: tên, workspace, description) + editor chiếm phần chính bên phải

**3. Polish CanvasEditor**
- Thêm placeholder text khi editor trống: "Gõ '/' để thêm block..."
- Đảm bảo min-height và padding hợp lý
- Test dark mode rendering

**4. Verify data flow**
- Khi bấm "Tạo dự án": log ra `{ projectName, workspaceId, editorContent }` 
- Đây là chuẩn bị cho Phase 2 khi sẽ thực sự insert vào DB

### Output
- Trang `/create-custom` có layout đầy đủ, giống production-ready
- User flow: chọn workspace → nhập tên → viết content trong editor → bấm "Tạo dự án" (log only)
- Sẵn sàng 100% cho Phase 2 (chỉ cần thay console.log bằng Supabase insert)

### Rủi ro
- Workspace selector cần fetch danh sách workspaces của user — phải handle loading state
- Editor content serialization: `JSON.stringify(editor.document)` có thể lớn — chưa cần giới hạn ở giai đoạn này

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/CreateCustomProject.tsx` | Nâng cấp UI: workspace selector, description, buttons, layout 2 cột |
| `src/components/canvas/CanvasEditor.tsx` | Thêm placeholder prop, padding |
| `src/App.tsx` | Verify route nằm trong ProtectedLayout (có thể không cần sửa) |

