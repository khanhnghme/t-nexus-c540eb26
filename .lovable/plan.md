

## Phase 5 — Giai doan 3/4: Kanban View trong Task Block

### Muc tieu
Them che do xem Kanban (cot theo status) cho task list block, cho phep user chuyen doi giua List view va Kanban view.

### Hien trang
- Stage 1/4: Custom block infrastructure + read-only
- Stage 2/4: CRUD (status change, add, delete) — hoan thanh
- TaskBlock hien tai chi co list view

### Hanh dong cu the

**1. Cap nhat `src/components/canvas/blocks/TaskBlock.tsx`**
- Them state `viewMode: "list" | "kanban"` (mac dinh `"list"`)
- Them toggle button (List/Kanban icon) trong header bar cua block
- Tach render logic thanh 2 component con:
  - `TaskListView` — giu nguyen logic list hien tai
  - `TaskKanbanView` — render 4 cot: TODO | IN_PROGRESS | DONE | VERIFIED
- Kanban view:
  - Moi cot co header voi ten status + so luong task
  - Task card hien thi: title, assignee, deadline
  - Khi editable: drag-drop task giua cac cot de thay doi status (dung HTML5 drag API don gian)
  - Khi editable: nut xoa tren moi card (hover)
  - Khi editable: input "Them task" o cuoi cot TODO
- Chia se chung `handleStatusChange`, `handleAddTask`, `handleDelete` giua 2 view

### Chi tiet ky thuat

```text
TaskListRenderer:
  ┌─ Header: [ListChecks icon] "Danh sach cong viec" [count] [List|Kanban toggle]
  │
  ├─ viewMode === "list" → <TaskListView tasks={...} ... />
  └─ viewMode === "kanban" → <TaskKanbanView tasks={...} ... />

TaskKanbanView:
  ┌──────────┬──────────┬──────────┬──────────┐
  │  Can lam │ Dang lam │Hoan thanh│ Da duyet │
  │  (TODO)  │(PROGRESS)│  (DONE)  │(VERIFIED)│
  ├──────────┼──────────┼──────────┼──────────┤
  │ [card]   │ [card]   │ [card]   │ [card]   │
  │ [card]   │          │          │          │
  │ [+add]   │          │          │          │
  └──────────┴──────────┴──────────┴──────────┘

  Drag card tu cot A sang cot B → handleStatusChange(taskId, newStatus)
```

### Khong lam trong giai doan nay
- Inline edit title, deadline, assignee (giai doan 4)
- External drag-drop library (dung HTML5 native)

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/TaskBlock.tsx` | Them Kanban view, view toggle, drag-drop |

