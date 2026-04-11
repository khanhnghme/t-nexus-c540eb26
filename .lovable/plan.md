

## Phase 5 — Giai doan 4/4: Inline Edit & Polish Task Block

### Muc tieu
Cho phep inline edit title va deadline truc tiep tren task card (ca List view va Kanban view). Cap nhat plan.md ghi nhan Phase 5 hoan tat.

### Hien trang
- Stage 1-3 hoan thanh: custom block, CRUD, kanban view, drag-drop
- Hien tai title va deadline chi hien thi read-only, chua edit duoc inline
- Assignee giu nguyen read-only (quan ly assignee thuoc task detail page)

### Hanh dong cu the

**1. Cap nhat `src/components/canvas/blocks/taskBlockTypes.ts`**
- Them `onUpdateTitle` va `onUpdateDeadline` vao `TaskHandlers` interface

**2. Cap nhat `src/components/canvas/blocks/TaskBlock.tsx`**
- Them `handleUpdateTitle(taskId, newTitle)` — update title trong DB + optimistic update state
- Them `handleUpdateDeadline(taskId, newDeadline)` — update deadline trong DB + optimistic update state
- Truyen them 2 handler moi vao `TaskHandlers`

**3. Cap nhat `src/components/canvas/blocks/TaskListView.tsx`**
- Title: khi editable, click vao title chuyen sang input inline (controlled state per row). Blur hoac Enter de save
- Deadline: khi editable, click vao deadline hien date picker (Popover + Calendar component). Chon ngay de save

**4. Cap nhat `src/components/canvas/blocks/TaskKanbanView.tsx`**
- Title: tuong tu list view — click de edit inline tren card
- Deadline: click de chon ngay qua date picker popover

**5. Cap nhat `.lovable/plan.md`**
- Ghi nhan Phase 5 hoan tat (4/4 stages done)

### Chi tiet ky thuat

```text
Inline Edit Flow:

  [Title] click → <Input value={title} autoFocus />
    → onBlur / Enter → handleUpdateTitle(taskId, newTitle)
    → Escape → cancel edit

  [Deadline] click → <Popover><Calendar /></Popover>
    → onSelect → handleUpdateDeadline(taskId, date.toISOString())

  Handler:
    supabase.from("tasks").update({ title }).eq("id", taskId)
    supabase.from("tasks").update({ deadline }).eq("id", taskId)
    + optimistic setTasks(prev => prev.map(...))
```

### Khong lam trong giai doan nay
- Inline assignee edit (quan ly o task detail page)
- Realtime sync giua nhieu user

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/components/canvas/blocks/taskBlockTypes.ts` | Them onUpdateTitle, onUpdateDeadline vao TaskHandlers |
| `src/components/canvas/blocks/TaskBlock.tsx` | Them 2 handler update title/deadline |
| `src/components/canvas/blocks/TaskListView.tsx` | Inline edit title + date picker deadline |
| `src/components/canvas/blocks/TaskKanbanView.tsx` | Inline edit title + date picker deadline |
| `.lovable/plan.md` | Phase 5 hoan tat |

