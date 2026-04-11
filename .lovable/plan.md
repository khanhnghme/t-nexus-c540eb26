

## Phase 9 — Giai đoạn 1/4: Tạo ToggleBlock cơ bản

### Mục tiêu
Tạo block `/toggle` (Accordion) cho phép user mở rộng/thu gọn nội dung. Giai đoạn 1 chỉ tạo block cơ bản với tiêu đề inline + toggle mở/đóng.

### Hành động

**Tạo `src/components/canvas/blocks/ToggleBlock.tsx`**
- Dùng `createReactBlockSpec` tương tự NoteBlock
- PropSchema:
  - `collapsed`: `{ default: "true" }` — trạng thái mở/đóng
- Content: `"inline"` — tiêu đề toggle
- Render:
  - Icon mũi tên xoay (▶ khi đóng, ▼ khi mở) — click để toggle
  - Tiêu đề inline bên phải mũi tên (contentRef)
  - Khi mở: hiện placeholder text "Toggle content area" (sẽ nâng cấp ở giai đoạn sau)
  - Style: border nhẹ, border-radius, padding tương tự NoteBlock

**Cập nhật `src/components/canvas/CanvasEditor.tsx`**
- Import `ToggleBlock` và đăng ký vào schema

### Chi tiết kỹ thuật

```text
Đóng:
┌──────────────────────────────────┐
│ ▶  Tiêu đề toggle               │
└──────────────────────────────────┘

Mở:
┌──────────────────────────────────┐
│ ▼  Tiêu đề toggle               │
│    Nội dung bên trong...         │
└──────────────────────────────────┘

propSchema: { collapsed: { default: "true" } }
content: "inline"
Toggle: click arrow → updateBlock({ props: { collapsed: toggled } })
```

### Không làm
- Nested blocks bên trong toggle (giai đoạn 2)
- Styling/theming cho toggle (giai đoạn 3)
- Animation mở/đóng (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/ToggleBlock.tsx` | Tạo mới — toggle block |
| `src/components/canvas/CanvasEditor.tsx` | Đăng ký toggleBlock vào schema |

