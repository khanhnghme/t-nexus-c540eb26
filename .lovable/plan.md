

## Phase 8 — Giai đoạn 3/4: Icon Picker UI cho NoteBlock

### Mục tiêu
Thêm UI cho phép user đổi icon của callout block — hiện tại icon chỉ dùng default "💡", chưa có cách thay đổi.

### Hiện trạng
- Stage 1/4 hoàn thành: NoteBlock render với icon + color
- Stage 2/4 hoàn thành: Color picker toolbar khi hover
- Icon prop `icon` đã có sẵn trong propSchema nhưng chưa có UI đổi

### Hành động

**Cập nhật `src/components/canvas/blocks/NoteBlock.tsx`**
- Click vào icon → hiện popover/dropdown với 6 icon preset: 💡 ⚠️ 📌 ✅ ❌ ℹ️
- Click icon trong dropdown → gọi `props.editor.updateBlock(props.block, { props: { icon: selectedIcon } })`
- Icon đang active có highlight
- Dropdown đóng sau khi chọn
- Dùng inline styles nhất quán với color picker đã có

### Chi tiết kỹ thuật

```text
Click icon:
┌─ [🔵][🟡][🟢][🔴][🟣][⚪] ──────┐
│ 💡 ← click here                   │
│  ┌──────────────┐                  │
│  │ 💡 ⚠️ 📌     │ ← icon picker   │
│  │ ✅ ❌ ℹ️     │                  │
│  └──────────────┘                  │
│     Nội dung ghi chú...            │
└────────────────────────────────────┘

onClick icon: setShowIconPicker(true)
onSelect: updateBlock → setShowIconPicker(false)
```

### Không làm
- Nested blocks (giai đoạn 4)
- Custom icon input (chỉ dùng preset)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/NoteBlock.tsx` | Thêm icon picker dropdown |

