

## Phase 4 — Giai đoạn 1/4: Multi-page Sidebar cho Custom Projects

### Bối cảnh
Hiện tại custom project chỉ hiển thị page đầu tiên (`pages?.[0]`), không có cách navigate giữa các pages hoặc tạo thêm page mới từ giao diện chính. Service layer (`projectPages.ts`) đã hỗ trợ đầy đủ CRUD + multi-page (fetch all, create, update, delete), nhưng UI chưa tận dụng.

### Mục tiêu giai đoạn 1/4
Thêm **sidebar danh sách pages** vào custom project view, cho phép:
- Xem danh sách tất cả pages của project
- Chuyển đổi giữa các pages
- Tạo page mới từ sidebar
- Xóa page (chỉ leader)

### Hành động cụ thể

**1. Tạo `src/components/canvas/CanvasSidebar.tsx`** (mới)
- Nhận props: `pages[]`, `activePageId`, `onSelectPage`, `onCreatePage`, `onDeletePage`, `editable`
- Render danh sách pages với title, highlight page đang active
- Nút "+" để tạo page mới
- Context menu hoặc icon button để xóa page (confirm trước khi xóa)
- Style: sidebar hẹp (~220px), collapsible trên mobile

**2. Cập nhật `src/components/canvas/CanvasPageView.tsx`**
- Thay vì chỉ render `pages?.[0]`, quản lý `activePageId` state
- Render `CanvasSidebar` bên trái + `CanvasEditor` bên phải (layout flex)
- Xử lý create page: gọi `useCreatePage`, auto-select page mới
- Xử lý delete page: gọi `useDeletePage`, fallback về page khác
- Truyền `editable` xuống sidebar

### Không làm trong giai đoạn này
- Đổi tên page (giai đoạn 2)
- Drag & drop sắp xếp thứ tự pages (giai đoạn 2)
- Page icon/emoji (giai đoạn 3)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasSidebar.tsx` | **Mới** — Sidebar danh sách pages |
| `src/components/canvas/CanvasPageView.tsx` | Layout sidebar + editor, multi-page state |

