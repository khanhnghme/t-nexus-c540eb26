

## Phase 5: Final QA & Print Optimization

### Bối cảnh
Phase 1-4 đã hoàn thành toàn bộ multi-column: cài đặt, responsive CSS, export Markdown/PDF, fix double-render, hover UX, edge cases. Phase 5 là phase cuối — tập trung vào print stylesheet, keyboard accessibility, và QA tổng thể.

### Bước thực hiện

**Bước 1: Print stylesheet cho columns**

File: `src/index.css`

- Thêm `@media print` rules cho `.bn-column-list` và `.bn-column`:
  - Columns hiển thị ngang (giữ flex layout) khi in từ trình duyệt
  - Ẩn hover outline/background trong print
  - Thêm `break-inside: avoid` để tránh column bị cắt giữa trang khi in
  - Border giữa columns dùng màu nhạt phù hợp in đen trắng

**Bước 2: Keyboard & accessibility cho columns**

File: `src/index.css`

- Thêm focus-visible style cho `.bn-column` khi user navigate bằng keyboard (outline rõ ràng hơn hover)
- Đảm bảo contrast ratio đủ cho border/divider trong cả light và dark mode

**Bước 3: Guard trong CanvasEditor — prevent crash khi data lỗi**

File: `src/components/canvas/CanvasEditor.tsx`

- Trong `filterBlocks`, thêm safe check: nếu `columnList` block có `children` không phải array hoặc chứa block type không hợp lệ → tự động unwrap thành blocks bình thường thay vì crash editor
- Log warning khi phát hiện malformed column data

**Bước 4: Cập nhật plan.md — đánh dấu hoàn thành**

File: `.lovable/plan.md`

- Ghi nhận Phase 5 hoàn tất
- Tóm tắt toàn bộ 5 phases đã triển khai

### Files thay đổi
1. `src/index.css` — ~15 dòng print stylesheet + focus styles
2. `src/components/canvas/CanvasEditor.tsx` — safe guard trong filterBlocks
3. `.lovable/plan.md` — cập nhật trạng thái

### Không thay đổi
- Database
- canvasExport.ts (đã hoàn thiện ở Phase 3-4)
- PublicCanvasPage

