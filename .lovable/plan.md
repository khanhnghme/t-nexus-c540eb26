

## Phase 3: Kiểm thử tương thích & Public View

### Bối cảnh
Phase 2 đã hoàn thành cả styling responsive lẫn export (Markdown + PDF) cho columns. Phase 3 tập trung vào kiểm thử backward compatibility và đảm bảo public view hoạt động đúng.

### Bước thực hiện

**Bước 1: Fix bug double-render children trong PDF export**

File: `src/lib/canvasExport.ts`

Hiện tại có lỗi logic: case `columnList` đã render children (các `column`) bên trong switch, nhưng cuối hàm `renderBlock` (dòng 317) lại render `block.children` lần nữa → nội dung columns bị lặp đôi trong PDF.

- Thêm `return` hoặc guard để `columnList` và `column` không bị render children 2 lần
- Tương tự trong `blockToMarkdown`: case `columnList` và `column` dùng `return` (đã đúng), nhưng cần verify không bị xung đột với logic children ở dòng 100-102

**Bước 2: Verify Public Canvas Page**

File: `src/pages/PublicCanvasPage.tsx`

- Kiểm tra component đã import đúng schema có `withMultiColumn` (thông qua `CanvasEditor` hoặc `CanvasPageView`)
- Đảm bảo read-only mode render columns chính xác — không cần sửa code nếu đã dùng chung editor component

**Bước 3: Test backward compatibility**

- Verify pages cũ (không có `columnList` blocks) vẫn load bình thường
- Verify `filterBlocks` cho phép `columnList`/`column` types đi qua
- Verify autosave không bị lỗi khi lưu content có columns

### Files thay đổi
1. `src/lib/canvasExport.ts` — fix double-render bug cho `columnList`/`column` trong PDF export

### Không thay đổi
- Database
- CanvasEditor (đã hoàn thành ở Phase 1-2)
- PublicCanvasPage (chỉ verify, không sửa)

