

## Phase 3 — Giai đoạn 2/4: Đồng bộ project_mode & truyền workspace context

### Mục tiêu
Đảm bảo Basic projects ghi rõ `project_mode: 'basic'` vào DB, và khi chọn Custom từ mode selector, workspace hiện tại được truyền sang `/create-custom` để user không phải chọn lại.

### Hiện trạng
- ✅ Mode Selector hoạt động: Basic → dialog cũ, Custom → navigate `/create-custom`
- ❌ `handleCreateGroup` (Basic) không set `project_mode` → DB default (có thể null)
- ❌ Navigate sang `/create-custom` không truyền workspace → user phải chọn lại workspace
- ❌ `CreateCustomProject` không nhận workspace từ URL/state

### Hành động cụ thể

**1. Cập nhật `Groups.tsx` — `handleCreateGroup`**
- Thêm `project_mode: 'basic'` vào `insertData` khi tạo project Basic
- Navigate sang `/create-custom` kèm workspace qua query param: `/create-custom?workspace={activeWorkspace.id}`

**2. Cập nhật `CreateCustomProject.tsx` — nhận workspace từ URL**
- Đọc `?workspace=` từ URL (useSearchParams)
- Nếu có → auto-select workspace đó, ẩn dropdown chọn workspace
- Nếu không có → giữ nguyên logic hiện tại (user tự chọn)

**3. Verify DB default**
- Kiểm tra column `project_mode` có default value hay không
- Nếu chưa có default → thêm migration set default `'basic'`

### Output
- Basic projects có `project_mode: 'basic'` rõ ràng trong DB
- Chọn Custom từ Groups → workspace được truyền tự động, không cần chọn lại
- Flow liền mạch từ mode selector đến tạo project

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Groups.tsx` | Thêm `project_mode: 'basic'` + truyền workspace qua URL |
| `src/pages/CreateCustomProject.tsx` | Nhận workspace từ query param, auto-select |
| Migration (nếu cần) | Set default `project_mode = 'basic'` cho column |

