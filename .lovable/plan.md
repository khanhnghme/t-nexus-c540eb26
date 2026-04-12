

## Giai đoạn C — Nâng cao UX: Column Resize & Add Column

### Mục tiêu
Bổ sung 2 tính năng nâng cao cho multi-column: (1) resize tỷ lệ cột tùy ý (30/70, 40/60...) và (2) nút "Add Column" khi hover vào column layout.

### Chia 4 phần triển khai

---

**Phần 1: Column Resize Handle — CSS & Component**

File mới: `src/components/canvas/ColumnResizeHandle.tsx`

- Tạo component `ColumnResizeHandle` — một thanh dọc mỏng giữa 2 cột, hiện khi hover
- Dùng `onMouseDown` / `onMouseMove` / `onMouseUp` native (không cần thư viện) để tính tỷ lệ mới
- Khi kéo: cập nhật CSS `flex-basis` trên 2 cột liền kề
- Khi thả: lưu tỷ lệ vào props của `columnList` block (ví dụ `props.widths: ["30%", "70%"]`)
- Giới hạn min 20% mỗi cột để tránh cột bị quá nhỏ
- Cursor `col-resize` khi hover/drag

File: `src/index.css`
- Thêm CSS cho `.column-resize-handle` (vị trí absolute, hover effect, cursor)

---

**Phần 2: Tích hợp Resize vào Editor**

File: `src/components/canvas/CanvasEditor.tsx`

- Sau khi editor render, dùng `useEffect` + MutationObserver để detect `[data-content-type="columnList"]` elements trong DOM
- Inject `ColumnResizeHandle` giữa các column elements
- Khi resize xong, gọi `editor.updateBlock()` để lưu tỷ lệ vào block props
- Chỉ hiển thị resize handle khi `editable === true`

---

**Phần 3: Nút "Add Column" khi hover**

File: `src/components/canvas/AddColumnButton.tsx`

- Component nút `+` nhỏ, hiện ở cạnh phải của `columnList` khi hover
- Click → gọi `editor.insertBlocks()` để thêm 1 `column` mới vào `columnList`
- Giới hạn tối đa 4 cột (sau đó ẩn nút)
- Chỉ hiện khi `editable === true`

File: `src/index.css`
- CSS cho `.add-column-button` (position absolute, right edge, opacity transition)

---

**Phần 4: Responsive & Edge Cases**

File: `src/index.css` + `src/components/canvas/ColumnResizeHandle.tsx`

- Ẩn resize handle và add-column button trên mobile (< 768px) vì columns stack dọc
- Ẩn trên tablet (< 1024px) nếu cột quá nhỏ
- Reset `flex-basis` về đều nhau khi xóa cột
- Xử lý edge case: resize khi đang có content dài trong cột

### Files thay đổi
1. `src/components/canvas/ColumnResizeHandle.tsx` — component mới
2. `src/components/canvas/AddColumnButton.tsx` — component mới
3. `src/components/canvas/CanvasEditor.tsx` — tích hợp resize + add column
4. `src/index.css` — CSS cho resize handle, add button, responsive

