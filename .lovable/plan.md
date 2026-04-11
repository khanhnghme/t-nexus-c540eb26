

## Phase 3 — Giai đoạn 3/4: Hiển thị project_mode trên Dashboard & Project Cards

### Mục tiêu
Hiển thị badge cho biết project là "Basic" hay "Custom" trên card ở Dashboard và trang Groups, giúp user phân biệt nhanh loại project.

### Hiện trạng
- ✅ Mode Selector hoạt động, project_mode được ghi vào DB
- ✅ Workspace context truyền qua URL khi tạo Custom
- ✅ GroupDetail phân luồng theo project_mode
- ❌ Dashboard card (`DashboardProjectCard`) không hiện project_mode
- ❌ Trang Groups list cũng không phân biệt project mode

### Hành động cụ thể

**1. Cập nhật `src/components/dashboard/DashboardProjectCard.tsx`**
- Thêm badge nhỏ hiện mode: "Custom" (icon Palette) khi `project_mode === 'custom'`
- Chỉ hiện badge cho Custom projects (Basic là mặc định, không cần badge)
- Vị trí: góc trên trái của card image hoặc trong metadata row phía dưới
- Style: badge nhỏ với backdrop-blur, tương tự badge "Public" đã có

**2. Cập nhật `src/pages/Groups.tsx`** — Project list hiện mode badge
- Tại nơi render danh sách projects (nếu có list view ngoài card), thêm indicator tương tự
- Đảm bảo data fetch đã include `project_mode` trong SELECT (verify query)

**3. Cập nhật `src/pages/Dashboard.tsx`** — Verify data fetch
- Kiểm tra query lấy groups đã include `project_mode` hay không
- Nếu dùng `select('*')` thì đã có sẵn, không cần sửa
- Nếu select cụ thể columns → thêm `project_mode`

### Output
- Cards trên Dashboard hiện badge "Custom" cho custom projects
- Basic projects không có badge (clean, vì là default)
- User dễ dàng phân biệt loại project ngay từ dashboard

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/dashboard/DashboardProjectCard.tsx` | Thêm badge "Custom" khi project_mode === 'custom' |
| `src/pages/Groups.tsx` | Verify + hiện mode indicator nếu cần |
| `src/pages/Dashboard.tsx` | Verify query include project_mode |

