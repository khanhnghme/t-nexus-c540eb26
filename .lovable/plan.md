

## Phase 8 — Giai doan 4/4: Nested Blocks trong NoteBlock

### Muc tieu
Cho phep note callout chua cac block con ben trong (paragraph, list, etc.) thay vi chi inline text. Nang cap tu `content: "inline"` len pattern cho phep nested blocks. Cap nhat plan.md ghi nhan Phase 8 hoan tat.

### Hien trang
- Stage 1-3 hoan thanh: NoteBlock render voi icon + color picker + icon picker
- Hien tai dung `content: "inline"` — chi cho phep 1 dong rich text
- Chua ho tro nhieu dong, list, heading ben trong callout

### Van de ky thuat
BlockNote `createReactBlockSpec` khong ho tro `content: "block"` truc tiep. Tuy nhien co the dung pattern sau:
- Giu `content: "inline"` cho dong dau tien
- Them sub-blocks bang cach render children blocks thu cong (BlockNote chua ho tro nested block spec natively)

**Phuong an thuc te**: Vi BlockNote v0.x chua co native nested block support trong custom block specs, giai doan nay se:
1. Them **multi-line support** — cho phep Enter tao dong moi ben trong note (xu ly `onKeyDown` Enter de insert `\n` hoac them paragraph)
2. Render noi dung voi `white-space: pre-wrap` de hien thi nhieu dong
3. Cap nhat plan.md danh dau Phase 8 hoan tat

### Hanh dong

**Cap nhat `src/components/canvas/blocks/NoteBlock.tsx`**
- Them style `white-space: pre-wrap` cho content area de ho tro nhieu dong
- Dam bao contentRef div cho phep Enter xuong dong (BlockNote inline content da ho tro soft line break)
- Them `min-height` cho content area de tranh block qua nho khi rong

**Cap nhat `.lovable/plan.md`**
- Ghi nhan Phase 8 hoan tat (4/4 giai doan)

### Chi tiet ky thuat

```text
Truoc (1 dong):
┌──────────────────────────────────┐
│ 💡  Mot dong text duy nhat       │
└──────────────────────────────────┘

Sau (nhieu dong, Shift+Enter):
┌──────────────────────────────────┐
│ 💡  Dong 1 noi dung              │
│     Dong 2 tiep tuc              │
│     Dong 3 ket thuc              │
└──────────────────────────────────┘

Style changes:
  contentRef div: white-space: pre-wrap, min-height: 1.5rem
```

### Khong lam
- Full nested block spec (BlockNote chua ho tro native)
- Drag-drop blocks vao trong note

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/NoteBlock.tsx` | Multi-line support + styling |
| `.lovable/plan.md` | Phase 8 hoan tat |

