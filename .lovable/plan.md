

## Phase 2 — Giai đoạn 3/4: Canvas View trong Project Detail

### Mục tiêu
Khi mở project có `project_mode: 'custom'`, hiển thị Canvas Editor thay vì giao diện task management mặc định. Load pages từ DB và cho phép edit với auto-save.

### Hiện trạng
- ✅ Service + hooks CRUD cho `project_pages` hoạt động
- ✅ `CanvasEditor` có auto-save + save indicator
- ✅ `CreateCustomProject` tạo group + page trong DB thành công
- ❌ `GroupDetail.tsx` (~787 dòng) luôn render task management UI, không phân biệt `project_mode`
- ❌ Chưa có page để view/edit canvas content sau khi tạo project

### Hành động cụ thể

**1. Tạo `src/components/canvas/CanvasPageView.tsx`** — Wrapper component cho canvas mode

- Nhận `groupId` prop
- Dùng `useProjectPages(groupId)` fetch danh sách pages
- Render page đầu tiên (default) trong `CanvasEditor` với `pageId` prop → kích hoạt auto-save
- Handle loading state và empty state (khi chưa có page nào)
- Hiển thị page title phía trên editor
- Chỉ cho phép edit nếu user là leader/admin (dùng role check từ `GroupDetail`)

**2. Cập nhật `GroupDetail.tsx`** — Phân luồng theo `project_mode`

- Sau khi fetch group data, kiểm tra `project_mode`
- Nếu `project_mode === 'custom'` → render `CanvasPageView` thay vì tabs (Tasks, Dashboard, Members...)
- Giữ nguyên sidebar info card và member card cho custom projects
- Truyền `isLeader`/`editable` prop xuống `CanvasPageView`

**3. Đảm bảo navigation hoạt động**

- Sau khi tạo project ở `/create-custom`, navigate tới `/groups/:groupId`
- `GroupDetail` detect `project_mode === 'custom'` → render canvas view
- Breadcrumb và back button hoạt động bình thường

### Output
- Tạo custom project → redirect → thấy canvas editor với content đã lưu
- Gõ thêm nội dung → auto-save hoạt động
- Mở lại project → load đúng content từ DB
- Basic mode projects không bị ảnh hưởng

### Rủi ro
- `GroupDetail.tsx` rất lớn (787 dòng) — cần sửa tối thiểu, chỉ thêm conditional render
- Group data hiện tại có thể không include `project_mode` trong SELECT — cần verify
- Role check cho editable cần map đúng với RLS policies đã có

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasPageView.tsx` | **Mới** — Canvas view wrapper với page loading + editor |
| `src/pages/GroupDetail.tsx` | Thêm conditional: nếu `project_mode === 'custom'` → render CanvasPageView |

