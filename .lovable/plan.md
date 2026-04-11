

## Phase 9 — Giai đoạn 2/4: Editable Content Area cho ToggleBlock

### Mục tiêu
Thay thế placeholder text "Toggle content area" bằng vùng nội dung editable — cho phép user nhập text bên trong toggle khi mở rộng.

### Hiện trạng
- Stage 1/4 hoàn thành: ToggleBlock render với tiêu đề inline + toggle mở/đóng
- Khi mở: chỉ hiện static text "Toggle content area" (contentEditable=false)
- User chưa thể nhập nội dung bên trong toggle

### Hành động

**Cập nhật `src/components/canvas/blocks/ToggleBlock.tsx`**
- Thêm prop `bodyText` vào propSchema (default: `""`) — lưu nội dung bên trong toggle
- Thay placeholder div bằng `<textarea>` hoặc `<div contentEditable>` cho phép nhập text
- onChange: gọi `props.editor.updateBlock(props.block, { props: { bodyText: value } })` để persist
- Placeholder text "Nhập nội dung..." khi rỗng
- Style: `white-space: pre-wrap`, font-size nhỏ hơn tiêu đề, auto-resize theo nội dung

### Chi tiết kỹ thuật

```text
Mở + editable:
┌──────────────────────────────────┐
│ ▼  Tiêu đề toggle               │
├──────────────────────────────────┤
│    [Nhập nội dung...         ]   │ ← editable area
│    [Nhiều dòng cũng được     ]   │
└──────────────────────────────────┘

New prop: bodyText: { default: "" }
Content area: contentEditable div hoặc textarea
onInput/onChange → updateBlock({ props: { bodyText } })
```

### Không làm
- Styling/theming cho toggle (giai đoạn 3)
- Animation mở/đóng (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/ToggleBlock.tsx` | Editable body area + bodyText prop |

