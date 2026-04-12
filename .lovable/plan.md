

## Phase 2: Styling & Responsive cho Column Layout

### Mục tiêu
Đảm bảo multi-column layout hiển thị đẹp trên mọi thiết bị, đồng thời cập nhật export để hỗ trợ columns.

### Bước thực hiện

**Bước 1: Thêm CSS cho multi-column**

File: `src/index.css`

- Thêm CSS rules cho `.bn-column-list` và `.bn-column`:
  - Desktop: columns hiển thị ngang, gap 16px, min-width mỗi cột 120px
  - Mobile (dưới 768px): columns tự động stack dọc (flex-direction: column)
  - Padding/margin hợp lý để nội dung không bị chật
  - Dark mode: border/divider giữa các cột phù hợp theme

**Bước 2: Mở rộng max-width editor khi có columns**

File: `src/components/canvas/CanvasEditor.tsx`

- Thay `max-w-[720px]` thành `max-w-[900px]` để columns có đủ không gian hiển thị
- Giữ nguyên padding `px-6` hiện tại

**Bước 3: Cập nhật export hỗ trợ columns**

File: `src/lib/canvasExport.ts`

- Thêm case `columnList` trong `blockToMarkdown()` — render các cột thành sections phân cách bằng `|`
- Thêm case `column` — render nội dung children bên trong
- Tương tự cho PDF export — render columns tuần tự (side-by-side trong PDF phức tạp, sequential đủ dùng)

**Bước 4: Verify public view**

File: `src/pages/PublicCanvasPage.tsx` — không cần sửa code vì đã dùng chung `CanvasPageView` → `CanvasEditor` với `editable={false}`. Chỉ cần verify CSS responsive áp dụng đúng.

### Files thay đổi
1. `src/index.css` — thêm ~20 dòng CSS cho column responsive
2. `src/components/canvas/CanvasEditor.tsx` — đổi max-width
3. `src/lib/canvasExport.ts` — thêm 2 case xử lý columnList/column

### Không thay đổi
- Database — không cần migration
- PublicCanvasPage — tự động hưởng lợi từ CSS mới

