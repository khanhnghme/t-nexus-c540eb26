

## Phase 8 — Giai đoạn 2/4: Color Picker UI cho NoteBlock

### Mục tiêu
Thêm UI cho phép user chọi màu nền callout block — hiện tại color chỉ dùng default, chưa có cách đổi.

### Hiện trạng
- Stage 1/4 hoàn thành: NoteBlock render với 6 preset colors, nhưng chưa có UI đổi màu
- Block prop `color` đã có sẵn trong propSchema

### Hành động

**Cập nhật `src/components/canvas/blocks/NoteBlock.tsx`**
- Thêm toolbar phía trên callout (hiện khi hover hoặc focus):
  - 6 ô màu tròn tương ứng 6 preset colors
  - Click → gọi `props.editor.updateBlock(props.block, { props: { color: selectedColor } })`
  - Ô đang active có border/ring highlight
- Toolbar chỉ hiện khi block đang được focus/hover, ẩn khi rời đi
- Dùng inline styles nhất quán với code hiện tại (không thêm dependency)

### Chi tiết kỹ thuật

```text
Hover/Focus state:
┌─ [🔵][🟡][🟢][🔴][🟣][⚪] ──────┐
│ 💡  Nội dung ghi chú...           │
└────────────────────────────────────┘

Color dots: 6 circles (16x16px), border khi selected
onClick: props.editor.updateBlock(props.block, { props: { color } })
```

### Không làm
- Icon picker (giai đoạn 3)
- Nested blocks (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/NoteBlock.tsx` | Thêm color picker toolbar |

