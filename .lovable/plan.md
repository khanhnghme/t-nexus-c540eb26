

## Giai đoạn D — Drag-to-Create Columns & Hoàn thiện tương tác

### Đánh giá hiện trạng

- ✅ `multiColumnDropCursor` đã được tích hợp — kéo block vào cạnh block khác để tạo column layout **đã hoạt động sẵn** nhờ `@blocknote/xl-multi-column`
- ✅ Resize handle giữa các cột
- ✅ Nút Add Column
- ❌ Chưa có visual feedback rõ ràng khi drag (drop zone highlight)
- ❌ Chưa có nút xóa column
- ❌ Resize widths chưa persist vào block data (chỉ cập nhật CSS runtime, mất khi reload)
- ❌ `useColumnControls` gọi `inject()` quá nhiều lần do MutationObserver → performance issue

### Chia 4 phần triển khai

---

**Phần 1: Visual feedback cho drag-to-create**

File: `src/index.css`

- Style cho drop cursor indicator của `multiColumnDropCursor` — highlight vùng sẽ tạo column mới
- Thêm animation nhẹ (fade-in border hoặc dashed outline) khi user đang drag block gần cạnh block khác
- Style cho `.bn-drop-cursor-multi-column` (class do thư viện tạo)

---

**Phần 2: Nút xóa column (Remove Column)**

File mới: `src/components/canvas/RemoveColumnButton.tsx`

- Nút `×` nhỏ hiện ở góc trên-phải mỗi column khi hover vào columnList
- Click → tìm block ID của column → gọi `editor.removeBlocks([columnId])`
- Nếu columnList chỉ còn 1 column sau khi xóa → unwrap column đó thành block thường (dùng logic tương tự `safeInitialContent`)
- Không hiện nếu columnList chỉ có 2 columns (giữ tối thiểu 2)

File: `src/components/canvas/useColumnControls.tsx`

- Inject `RemoveColumnButton` vào mỗi column element
- Truyền callback `onRemoveColumn` từ `CanvasEditor`

File: `src/components/canvas/CanvasEditor.tsx`

- Thêm `handleRemoveColumn(columnListEl, columnIndex)` callback
- Dùng `editor.removeBlocks()` để xóa column, trigger autosave

---

**Phần 3: Persist resize widths**

File: `src/components/canvas/useColumnControls.tsx`

- Khi `onResizeEnd` được gọi, lưu tỷ lệ width vào `data-width` attribute trên column DOM elements
- Khi re-inject, đọc `data-width` để restore `flex` style

File: `src/components/canvas/CanvasEditor.tsx`

- Sau resize, serialize custom widths vào document JSON (thêm field `props.widths` vào columnList block nếu BlockNote schema cho phép, hoặc lưu vào metadata riêng)
- Khi load `safeInitialContent`, apply widths từ props lên DOM sau khi editor mount

---

**Phần 4: Performance — throttle MutationObserver**

File: `src/components/canvas/useColumnControls.tsx`

- Thêm debounce/throttle cho `inject()` trong MutationObserver callback (hiện gọi mỗi mutation → render loop)
- Dùng `requestIdleCallback` hoặc `setTimeout 100ms` thay vì `requestAnimationFrame` trực tiếp
- Skip re-inject nếu DOM structure không thực sự thay đổi (so sánh column count)
- Cleanup: chỉ unmount/remount roots thay đổi, không cleanup toàn bộ mỗi lần

### Files thay đổi
1. `src/index.css` — drop cursor visual feedback
2. `src/components/canvas/RemoveColumnButton.tsx` — component mới
3. `src/components/canvas/useColumnControls.tsx` — inject remove button, persist widths, throttle observer
4. `src/components/canvas/CanvasEditor.tsx` — handleRemoveColumn callback, width persistence logic

