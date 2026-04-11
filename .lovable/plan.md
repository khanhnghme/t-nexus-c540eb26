

## Phase 4 — Giai đoạn 2/4: Đổi tên page & Drag-drop sắp xếp thứ tự

### Mục tiêu
Cho phép user đổi tên page trực tiếp từ sidebar và kéo thả để sắp xếp lại thứ tự pages.

### Hành động cụ thể

**1. Cập nhật `src/components/canvas/CanvasSidebar.tsx`** — Inline rename
- Double-click vào tên page chuyển sang input field inline (editable mode)
- Enter hoặc blur để save, Escape để cancel
- Gọi callback `onRenamePage(pageId, newTitle)` lên parent
- Chỉ cho phép rename khi `editable === true`

**2. Cập nhật `src/components/canvas/CanvasSidebar.tsx`** — Drag & drop reorder
- Sử dụng `@dnd-kit/core` + `@dnd-kit/sortable` (hoặc thư viện tương tự đã có trong project)
- Wrap danh sách pages trong `SortableContext`, mỗi page item là `useSortable`
- Khi drop xong, gọi callback `onReorderPages(orderedIds)` lên parent
- Hiện drag handle icon (GripVertical) khi hover, chỉ khi editable

**3. Cập nhật `src/components/canvas/CanvasPageView.tsx`** — Handle rename & reorder
- Thêm handler `handleRenamePage`: gọi `useUpdatePage` với `{ title: newTitle }`
- Thêm handler `handleReorderPages`: tính lại `display_order` cho từng page, gọi `useUpdatePage` cho mỗi page thay đổi thứ tự
- Truyền 2 callbacks mới xuống `CanvasSidebar`

**4. Install dependency (nếu chưa có)**
- Kiểm tra và cài `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` nếu chưa có trong project

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasSidebar.tsx` | Inline rename + drag-drop reorder |
| `src/components/canvas/CanvasPageView.tsx` | Thêm rename & reorder handlers |
| `package.json` | Thêm `@dnd-kit/*` nếu chưa có |

