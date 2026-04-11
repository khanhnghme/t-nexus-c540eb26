

## Phase 9 — Giai doan 4/4: Animation mo/dong cho ToggleBlock

### Muc tieu
Them animation mo/dong cho vung noi dung toggle — content area slide down khi mo, slide up khi dong, tao cam giac muot ma.

### Hien trang
- Stage 1-3 hoan thanh: ToggleBlock co tieu de inline, editable body, styling/hover/chevron transition
- Content area hien/an bang conditional render (`{!isCollapsed && ...}`) — khong co animation

### Hanh dong

**Cap nhat `src/components/canvas/blocks/ToggleBlock.tsx`**
- Thay conditional render bang render luon content area nhung dung animation height + opacity
- Dung pattern: container div voi `overflow: hidden`, `max-height` transition (0 khi dong, scrollHeight khi mo)
- Kem theo opacity transition (0 → 1 khi mo, 1 → 0 khi dong)
- Dung `useRef` de do `scrollHeight` cua content area
- Dung `useEffect` de cap nhat max-height khi collapsed thay doi
- Duration: 200ms ease, dong bo voi chevron rotation

**Cap nhat `.lovable/plan.md`**
- Ghi nhan Phase 9 hoan tat

### Chi tiet ky thuat

```text
Dong:
  max-height: 0
  opacity: 0
  overflow: hidden
  transition: max-height 200ms ease, opacity 150ms ease

Mo:
  max-height: scrollHeight + "px"
  opacity: 1

Content div luon render (khong dung conditional)
  → cho phep CSS transition hoat dong

useRef → do scrollHeight
useEffect([isCollapsed]) → cap nhat style
```

### Khong lam
- Thay doi prop schema
- Thay doi logic toggle/body

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/ToggleBlock.tsx` | Animation mo/dong |
| `.lovable/plan.md` | Phase 9 hoan tat |

