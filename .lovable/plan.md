## Phase 5 — Custom Block `/task` ✅ HOÀN TẤT

### Tổng kết
- **Giai đoạn 1/4**: Custom block infrastructure + read-only task list display
- **Giai đoạn 2/4**: CRUD — thay đổi status, thêm task mới, xóa task
- **Giai đoạn 3/4**: Kanban view + drag-drop chuyển status giữa các cột
- **Giai đoạn 4/4**: Inline edit title + deadline picker (List & Kanban view)

### Files chính
| File | Mô tả |
|------|--------|
| `src/components/canvas/blocks/TaskBlock.tsx` | Main block component, handlers, state |
| `src/components/canvas/blocks/TaskListView.tsx` | List view với inline edit |
| `src/components/canvas/blocks/TaskKanbanView.tsx` | Kanban view với drag-drop + inline edit |
| `src/components/canvas/blocks/taskBlockTypes.ts` | Shared types & status config |
| `src/components/canvas/blocks/TaskBlockContext.tsx` | Context provider (groupId, editable) |
