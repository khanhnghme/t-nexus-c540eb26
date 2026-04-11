

## Phase 9 — Giai doan 3/4: Styling va Theming cho ToggleBlock

### Muc tieu
Nang cap giao dien ToggleBlock — them background color nhe, hover effect, va transition cho chevron icon de toggle tro nen dep va chuyen nghiep hon.

### Hien trang
- Stage 1-2 hoan thanh: ToggleBlock co tieu de inline + editable textarea body
- Style hien tai: chi co border co ban, chua co hover effect, chua co background, chevron chua co transition

### Hanh dong

**Cap nhat `src/components/canvas/blocks/ToggleBlock.tsx`**
- Them background nhe cho block (`hsl(var(--muted))` voi opacity thap)
- Hover effect tren header row (background sang hon khi hover)
- Transition rotate cho chevron icon (transform + transition 200ms)
- Dung CSS transform `rotate(90deg)` thay vi swap giua ChevronRight/ChevronDown — chi dung 1 icon `ChevronRight` voi rotation
- Them hover effect cho toggle button (border-radius, background on hover)
- Typography: tinh chinh font-weight, line-height cho tieu de va body

### Chi tiet ky thuat

```text
Truoc:
┌──────────────────────────────────┐  ← border only
│ ▶  Tieu de                       │
└──────────────────────────────────┘

Sau:
┌──────────────────────────────────┐  ← subtle background + border
│ ▶  Tieu de                       │  ← hover: darker bg
├──────────────────────────────────┤
│    Noi dung...                   │
└──────────────────────────────────┘

Chevron: 1 icon ChevronRight
  collapsed: transform: rotate(0)
  expanded:  transform: rotate(90deg)
  transition: transform 200ms ease
```

### Khong lam
- Animation mo/dong cho content area (giai doan 4)
- Thay doi prop schema

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/ToggleBlock.tsx` | Styling + hover + chevron transition |

