

## Phase 5 — Giai doan 2/4: CRUD Task tu trong Block

### Muc tieu
Cho phep user tuong tac truc tiep voi task list block trong canvas: thay doi status, va tao task moi ngay trong block (khi editable).

### Hien trang
- Stage 1/4 da hoan thanh: custom block `taskList` hien thi read-only danh sach task (title, status, assignee, deadline)
- TaskBlockContext cung cap `groupId` va `editable`
- Chua co tuong tac nao tu block

### Hanh dong cu the

**1. Cap nhat `src/components/canvas/blocks/TaskBlock.tsx`** — Them CRUD
- **Thay doi status**: Click vao status badge mo dropdown (Select) cho phep chuyen status: TODO → IN_PROGRESS → DONE. Chi hien khi `editable = true`
- **Tao task moi**: Them input row cuoi danh sach (khi editable). Nhap title + Enter → insert task vao DB voi `group_id` va status `TODO`
- **Xoa task**: Them nut xoa (icon Trash nho) khi hover vao task row, chi khi editable. Confirm truoc khi xoa
- Sau moi thao tac CRUD, refetch danh sach tasks de cap nhat UI
- Su dung `useTaskBlockContext()` de kiem tra `editable` truoc khi render cac control

**2. Cap nhat `src/components/canvas/blocks/TaskBlockContext.tsx`** (khong thay doi)
- Context da du `groupId` va `editable`, khong can them gi

### Chi tiet ky thuat

```text
TaskListRenderer (editable = true):

  [Task Row]
    ├─ Title (text)
    ├─ Status Badge → click → Dropdown (TODO | IN_PROGRESS | DONE)
    │   └─ onChange → supabase.from("tasks").update({ status }).eq("id", taskId)
    ├─ Assignee (read-only)
    ├─ Deadline (read-only)
    └─ Trash icon (hover) → confirm → supabase.from("tasks").delete().eq("id", taskId)

  [+ Add task row]
    └─ Input + Enter → supabase.from("tasks").insert({ title, group_id, status: "TODO" })
```

### Khong lam trong giai doan nay
- Kanban view (giai doan 3)
- Inline edit title, deadline, assignee (giai doan 4)
- Drag-drop reorder tasks

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/TaskBlock.tsx` | Them status dropdown, add task input, delete button |

