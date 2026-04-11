

## Phase 4 — Giai đoạn 4/4: Polish & Hoàn thiện Multi-page Canvas

### Mục tiêu
Hoàn thiện Phase 4 bằng cách xử lý edge cases, cải thiện UX tổng thể cho sidebar + editor, và cập nhật plan.md ghi nhận Phase 4 hoàn tất.

### Hiện trạng
- ✅ Sidebar danh sách pages (1/4)
- ✅ Inline rename + drag-drop reorder (2/4)
- ✅ Page icon/emoji (3/4)
- Chưa có: responsive/mobile handling, empty state polish, sidebar collapse

### Hành động cụ thể

**1. Cập nhật `src/components/canvas/CanvasSidebar.tsx`** — Responsive & UX polish
- Thêm nút collapse/expand sidebar (toggle ẩn/hiện sidebar trên mobile hoặc khi cần thêm không gian editor)
- Thu gọn sidebar width trên màn hình nhỏ hoặc ẩn hoàn toàn với toggle button
- Tooltip cho các nút action (tạo, xóa) để UX rõ ràng hơn

**2. Cập nhật `src/components/canvas/CanvasPageView.tsx`** — Sidebar toggle state
- Quản lý state `sidebarOpen` (mặc định true trên desktop, false trên mobile)
- Truyền toggle props xuống sidebar
- Hiện nút mở sidebar khi sidebar đang ẩn

**3. Cập nhật `src/components/canvas/CanvasEditor.tsx`** — Hiển thị page title
- Hiển thị tên page hiện tại phía trên editor (dạng breadcrumb nhẹ hoặc title bar)
- Giúp user biết đang edit page nào khi sidebar bị ẩn

**4. Cập nhật `.lovable/plan.md`**
- Ghi nhận Phase 4 hoàn tất
- Tóm tắt output: sidebar multi-page, rename, drag-drop, emoji icon, responsive

### Không làm trong giai đoạn này
- Page cover image (nếu cần sẽ là Phase riêng)
- Realtime collaboration

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasSidebar.tsx` | Collapse toggle, responsive, tooltip |
| `src/components/canvas/CanvasPageView.tsx` | Sidebar toggle state, mobile handling |
| `src/components/canvas/CanvasEditor.tsx` | Hiển thị page title phía trên editor |
| `.lovable/plan.md` | Phase 4 hoàn tất |

