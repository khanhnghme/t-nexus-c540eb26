

## Phase 8 — Block `/note` — Callout Block với Rich Text

**Lưu ý**: Phase 8 gốc trong roadmap (Kanban View Toggle) đã được xây dựng hoàn chỉnh trong TaskBlock (toggle List/Kanban + drag-drop giữa cột status). Vì vậy Phase 8 sẽ triển khai tính năng chưa làm tiếp theo: **Block `/note`** (roadmap Phase 6).

### Giai đoạn 1/4: Tạo NoteBlock — Callout cơ bản với icon + background color

**Mục tiêu**: Gõ `/note` trong canvas → chèn callout block có icon, background color, và nội dung text bên trong.

### Hiện trạng
- Các custom blocks đã có: `/task`, `/member`, `/calendar`
- Pattern đăng ký block trong `CanvasEditor.tsx` đã rõ ràng
- BlockNote hỗ trợ `content: "inline"` cho blocks có text bên trong

### Hành động

**Tạo `src/components/canvas/blocks/NoteBlock.tsx`**
- Custom block spec với `createReactBlockSpec`:
  - `type: "noteCallout"`
  - `propSchema`: `icon` (string, default "💡"), `color` (string, default "#f0f9ff")
  - `content: "inline"` — cho phép gõ rich text bên trong block
- Render: container với `backgroundColor` từ prop, icon bên trái, inline content bên phải
- 6 preset colors: xanh dương nhạt, vàng nhạt, xanh lá nhạt, hồng nhạt, tím nhạt, xám nhạt

**Cập nhật `src/components/canvas/CanvasEditor.tsx`**
- Import `NoteCalloutBlock` 
- Đăng ký vào schema + slash menu item (icon: `StickyNote`, label: "Ghi chú")

### Chi tiết kỹ thuật

```text
Block render:
┌─────────────────────────────────────┐
│ 💡  Nội dung ghi chú rich text...  │
│     có thể bold, italic, link...    │
└─────────────────────────────────────┘
  ↑ bg-blue-50/bg-yellow-50/...
  ↑ icon bên trái, text content bên phải

propSchema:
  icon: { default: "💡", values: ["💡","⚠️","📌","✅","❌","ℹ️"] }
  color: { default: "#f0f9ff" }
```

### Không làm trong giai đoạn này
- Color picker UI (giai đoạn 2)
- Icon picker UI (giai đoạn 3)
- Nested blocks bên trong note (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/NoteBlock.tsx` | Tạo mới — callout block |
| `src/components/canvas/CanvasEditor.tsx` | Đăng ký noteCallout block |

