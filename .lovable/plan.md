

## Giai đoạn A — Ổn định runtime multi-column editor

### Tổng quan
Fix các bug runtime còn lại để multi-column hoạt động ổn định: dictionary merge đúng cách, xử lý dữ liệu cũ không hợp lệ, và thêm CSS cơ bản cho column layout.

### Chia 4 phần triển khai

---

**Phần 1: Hoàn thiện dictionary merge**

File: `src/components/canvas/CanvasEditor.tsx`

Hiện tại dòng 172 dùng `{ ...bnEnLocale, multi_column: mcLocale }` — cách này hoạt động nhưng chưa an toàn khi BlockNote cập nhật thêm key mới. Cần:

- Thêm try-catch quanh `getMultiColumnSlashMenuItems(editor)` trong `getSlashMenuItems` để nếu dictionary thiếu key thì slash menu vẫn hiện các item cơ bản thay vì crash toàn bộ
- Log warning thay vì crash khi multi-column items không load được

---

**Phần 2: Bảo vệ dữ liệu cũ (data migration guard)**

File: `src/components/canvas/CanvasEditor.tsx`

Hàm `safeInitialContent` (dòng 140-163) đã có guard cho `columnList`/`column`, nhưng cần bổ sung:

- Xử lý case `column` block không nằm trong `columnList` (block mồ côi) — unwrap children ra ngoài
- Xử lý case `columnList` chỉ có 1 column — unwrap column đó ra thành block thường
- Thêm guard cho `children` là `null` thay vì `undefined` hoặc `[]`

---

**Phần 3: CSS cho column layout**

File: `src/index.css`

Thêm CSS đảm bảo columns hiển thị đúng:

```css
/* Multi-column responsive */
@media (max-width: 768px) {
  [data-content-type="columnList"] {
    flex-direction: column !important;
  }
  [data-content-type="column"] {
    width: 100% !important;
    min-width: 100% !important;
  }
}

/* Column min-height for empty columns */
[data-content-type="column"] {
  min-height: 40px;
}

/* Print: avoid breaking columns */
@media print {
  [data-content-type="columnList"] {
    break-inside: avoid;
  }
}
```

---

**Phần 4: Kiểm thử & fix edge cases**

- Mở editor, gõ `/` → xác nhận "Two Columns" và "Three Columns" hiện
- Tạo column layout → thêm nội dung vào từng cột → lưu → reload → xác nhận dữ liệu giữ nguyên
- Thu nhỏ viewport xuống mobile → xác nhận columns stack dọc
- Mở page có dữ liệu cũ (không có column) → xác nhận không crash

### Files thay đổi
1. `src/components/canvas/CanvasEditor.tsx` — try-catch slash menu items + data guard mở rộng
2. `src/index.css` — CSS responsive và print cho columns

