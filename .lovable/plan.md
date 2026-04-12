

## Giai đoạn B — CSS, Print & Accessibility cho Multi-Column

### Đánh giá hiện trạng

Phần lớn CSS cơ bản đã được triển khai trong Phase A:
- ✅ Responsive mobile (stack dọc dưới 768px)
- ✅ Print stylesheet (break-inside, flex row)
- ✅ Focus styles (`:focus-visible` trên `.bn-column`)
- ✅ View-mode (tắt hover effects)
- ✅ Empty column min-height
- ✅ PDF/Markdown export đã xử lý `columnList`/`column`

### Công việc còn lại — 3 phần

---

**Phần 1: Cải thiện tablet breakpoint (768–1024px)**

File: `src/index.css`

Hiện tại chỉ có 2 breakpoint: desktop (giữ nguyên) và mobile (<768px, stack dọc). Tablet cần xử lý riêng:

```css
@media (min-width: 769px) and (max-width: 1024px) {
  .bn-column-list {
    gap: 10px;
  }
  .bn-column {
    min-width: 100px;
  }
}
```

---

**Phần 2: Cải thiện PDF export — render columns song song**

File: `src/lib/canvasExport.ts`

Hiện tại `columnList` trong PDF render tuần tự (Cột 1 rồi Cột 2). Cải thiện bằng cách dùng jsPDF table layout để đặt columns cạnh nhau:

- Chia `contentWidth` cho số columns
- Render mỗi column vào vùng x tương ứng
- Fallback về sequential nếu nội dung quá dài

---

**Phần 3: Accessibility — ARIA attributes & keyboard nav**

File: `src/index.css` + `src/components/canvas/CanvasEditor.tsx`

- Thêm CSS cho `[role="group"]` trên columnList (BlockNote tự thêm role)
- Đảm bảo Tab key di chuyển giữa các columns đúng thứ tự
- Thêm `aria-label` cho column containers qua CSS `::before` content (screen reader)
- High contrast mode support cho column borders

```css
@media (forced-colors: active) {
  .bn-column {
    border-left-color: CanvasText;
  }
}
```

### Files thay đổi
1. `src/index.css` — tablet breakpoint, high contrast, ARIA styles
2. `src/lib/canvasExport.ts` — PDF column side-by-side layout

