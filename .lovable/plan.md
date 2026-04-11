

## Phase 7 — Giai doan 3/4: Click ngay hien danh sach tasks (Selected Day Panel)

### Muc tieu
Khi user click vao 1 ngay co deadline tren mini calendar, hien thi danh sach tasks cua ngay do phia duoi calendar (thay vi chi tooltip khi hover).

### Hien trang
- Stage 1/4: Read-only mini calendar voi dots — hoan thanh
- Stage 2/4: Realtime subscription — hoan thanh
- Hien tai chi co tooltip khi hover, khong co cach xem chi tiet khi click

### Hanh dong

**Cap nhat `src/components/canvas/blocks/CalendarBlock.tsx`**
- Them state `selectedDay: Date | null`
- Khi click vao ngay co tasks → set `selectedDay` (dung `onSelect` cua DayPicker mode="single")
- Click lai ngay da chon → bo chon (`setSelectedDay(null)`)
- Khi `selectedDay` co gia tri va co tasks → render panel phia duoi calendar:
  - Header: ngay duoc chon (dd/MM/yyyy)
  - Danh sach tasks: title + status badge + deadline time
  - Moi task hien thi status voi mau tuong ung (done = xanh, in_progress = vang, todo = xam)
- Xoa state `hoveredDay` khong con dung

### Chi tiet ky thuat

```text
Layout khi chon ngay 09/04/2026:
┌──────────────────────────────────┐
│ 📅 Lich deadline           [12] │
├──────────────────────────────────┤
│      << Thang 4, 2026 >>        │
│  CN  T2  T3  T4  T5  T6  T7    │
│   ...  [9]  ...                 │
│              ↑ selected          │
├──────────────────────────────────┤
│  09/04/2026                      │
│  • Task A          [In Progress] │
│  • Task B          [Done]        │
│  • Task C          [Todo]        │
└──────────────────────────────────┘

onSelect callback:
  if (day && isSameDay(day, selectedDay)) setSelectedDay(null)
  else setSelectedDay(day)
```

### Khong lam
- Tao task tu calendar (giai doan 4)
- Month/Week view toggle (ngoai scope Phase 7)

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/CalendarBlock.tsx` | Them selected day panel + onSelect logic |

