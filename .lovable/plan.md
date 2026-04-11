

## Phase 3 — Giai đoạn 4/4: Polish & Edge Cases cho Mode System

### Mục tiêu
Hoàn thiện Phase 3 bằng cách xử lý edge cases, cải thiện UX cho Mode Selector, và đảm bảo toàn bộ flow mode hoạt động nhất quán.

### Hiện trạng
- ✅ Mode Selector UI hoạt động (1/4)
- ✅ project_mode ghi đúng vào DB + workspace context truyền qua URL (2/4)
- ✅ Badge "Custom" hiện trên Dashboard cards (3/4)
- ❌ Mode Selector chưa có animation mở/đóng mượt
- ❌ GroupDetail custom view chưa có header/back navigation (chỉ render CanvasPageView trơn)
- ❌ Chưa có empty state khi chưa có project nào trên Groups page (cả Basic lẫn Custom)
- ❌ Mode Selector dialog chưa có title/description rõ ràng

### Hành động cụ thể

**1. Cải thiện Mode Selector Dialog (`src/pages/Groups.tsx`)**
- Thêm title "Chọn loại dự án" và subtitle cho dialog chứa Mode Selector
- Đảm bảo dialog đóng khi bấm outside hoặc Escape
- Thêm animation fade-in cho dialog content

**2. Cải thiện Custom Project trong GroupDetail (`src/pages/GroupDetail.tsx`)**
- Thêm project header (tên project, back button) cho custom view — hiện tại chỉ render `CanvasPageView` trơn không có context
- Đảm bảo user biết mình đang ở project nào khi xem canvas

**3. Cập nhật plan.md**
- Đánh dấu Phase 3 hoàn tất
- Ghi lại trạng thái sẵn sàng cho Phase tiếp theo

### Output
- Mode Selector dialog có title rõ ràng, UX mượt
- Custom project view có header với tên project + navigation
- Phase 3 hoàn tất, sẵn sàng chuyển Phase tiếp

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Groups.tsx` | Cải thiện dialog title/subtitle cho mode selector |
| `src/pages/GroupDetail.tsx` | Thêm header cho custom project view |
| `.lovable/plan.md` | Cập nhật trạng thái Phase 3 hoàn tất |

