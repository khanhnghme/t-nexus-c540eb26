

## Phase 7 — Giai doan 4/4: Click ngay de tao task voi deadline tu Calendar Block

### Muc tieu
Khi user click vao 1 ngay **khong co task** (hoac bam nut "+" trong selected day panel), hien thi input tao task nhanh voi deadline tu dong set bang ngay do. Chi cho phep khi `editable === true`. Cap nhat plan.md ghi nhan Phase 7 hoan tat.

### Hien trang
- Stage 1-3 hoan thanh: mini calendar, realtime, selected day panel
- Chua co cach tao task tu calendar block
- TaskBlock da co pattern `handleAddTask` — reuse logic tuong tu

### Hanh dong

**Cap nhat `src/components/canvas/blocks/CalendarBlock.tsx`**

1. **Hien thi selected day panel cho moi ngay** (ke ca ngay khong co task) — hien tai chi hien khi co tasks
2. **Them inline input tao task** trong selected day panel:
   - Input text + nut "Them" (hoac Enter)
   - Chi hien khi `editable === true` (lay tu `useTaskBlockContext`)
   - Khi submit: insert task voi `group_id`, `title`, `status: "TODO"`, `deadline` = selectedDay (set gio 23:59), `created_by` = current user
   - Realtime se tu dong cap nhat calendar dots
3. **Khi click ngay khong co task** → van hien selected day panel voi thong bao "Khong co deadline" + input tao task

**Cap nhat `.lovable/plan.md`** — ghi nhan Phase 7 hoan tat

### Chi tiet ky thuat

```text
Selected Day Panel (updated):
┌──────────────────────────────────┐
│  09/04/2026                      │
│  • Task A          [In Progress] │
│  • Task B          [Done]        │
│  ─────────────────────────────── │
│  [+ Them task deadline...]  [Add]│
└──────────────────────────────────┘

Ngay khong co task:
┌──────────────────────────────────┐
│  10/04/2026                      │
│  Khong co deadline               │
│  [+ Them task deadline...]  [Add]│
└──────────────────────────────────┘

Insert logic (reuse pattern tu TaskBlock):
  supabase.from("tasks").insert({
    title, group_id: groupId,
    status: "TODO", created_by: userId,
    deadline: format(selectedDay, "yyyy-MM-dd") + "T23:59:00"
  })
```

### Khong lam
- Sua/xoa task tu calendar block
- Month/Week view toggle (ngoai scope)

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/CalendarBlock.tsx` | Them inline task creation + hien panel cho moi ngay |
| `.lovable/plan.md` | Phase 7 hoan tat |

