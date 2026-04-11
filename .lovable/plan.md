

## Phase 6 — Giai doan 3/4: Grid View Toggle cho Member Block

### Muc tieu
Them che do xem Grid (dang luoi) ben canh List view hien tai, cho phep user chuyen doi giua 2 che do hien thi.

### Hien trang
- Stage 1/4: Read-only member list — hoan thanh
- Stage 2/4: Realtime subscription — hoan thanh
- Hien tai chi co list view (danh sach doc)

### Hanh dong cu the

**1. Cap nhat `src/components/canvas/blocks/MemberBlock.tsx`**
- Them state `viewMode: "list" | "grid"` (default: "list")
- Them toggle button (List / LayoutGrid icon) ben canh count badge trong header
- List view: giu nguyen layout hien tai
- Grid view: render members dang grid (2-3 cot), moi member la 1 card nho voi avatar lon hon, ten, role badge

### Chi tiet ky thuat

```text
Header:
  ┌──────────────────────────────────────────┐
  │ 👥 Thanh vien du an   [List|Grid] [count]│
  └──────────────────────────────────────────┘

Grid View:
  ┌────────────┐  ┌────────────┐  ┌────────────┐
  │  [Avatar]  │  │  [Avatar]  │  │  [Avatar]  │
  │  Nguyen A  │  │  Tran B    │  │  Le C      │
  │  Owner     │  │  Admin     │  │  Member    │
  └────────────┘  └────────────┘  └────────────┘

Toggle:
  useState("list") → click icon → setViewMode("grid")
  List icon: <List />    Grid icon: <LayoutGrid />
```

### Khong lam trong giai doan nay
- Invite member tu block (giai doan 4)

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/MemberBlock.tsx` | Them grid view + toggle button |

