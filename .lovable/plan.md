

## Phase 14 — Inline Task Creation nâng cao

### Mục tiêu
Nâng cấp trải nghiệm tạo task trong Task Block: thêm khả năng assign member và set deadline ngay khi tạo, không cần mở dialog.

### Hiện trạng
- Inline "Add task" row đã có: gõ tên + Enter → tạo task với status "TODO"
- Chưa có assign member khi tạo inline
- Chưa có set deadline khi tạo inline
- Member data đã có sẵn query pattern từ `MemberBlock.tsx` (`group_members` + `profiles`)

### Công việc

**1. Tạo component `InlineTaskCreator.tsx`**

Thay thế input đơn giản hiện tại bằng component mới:
- Input tên task (giữ nguyên Enter = tạo)
- Nút assign member: dropdown hiển thị danh sách member của group (fetch từ `group_members`)
- Nút set deadline: date picker popup (dùng `Calendar` component có sẵn)
- Sau khi tạo task xong → auto insert `task_assignments` nếu có chọn member
- UI compact: các nút icon nhỏ bên cạnh input, chỉ expand khi click

**2. Cập nhật `TaskBlock.tsx`**

- `handleAddTask` mở rộng: nhận thêm `assigneeId?: string` và `deadline?: string`
- Sau khi insert task → nếu có `assigneeId` → insert vào `task_assignments`
- Sau khi insert task → nếu có `deadline` → update task deadline
- Cập nhật `TaskHandlers` type trong `taskBlockTypes.ts`: `onAdd` nhận params mới

**3. Cập nhật `TaskListView.tsx` và `TaskKanbanView.tsx`**

- Thay inline input cũ bằng `InlineTaskCreator`
- Truyền `groupId` để component fetch member list
- Giữ nguyên UX: focus vào input → gõ tên → tùy chọn assign/deadline → Enter

**4. Cập nhật `taskBlockTypes.ts`**

```typescript
interface TaskHandlers {
  onAdd: (params?: { assigneeId?: string; deadline?: string }) => Promise<void>;
  // ... giữ nguyên các handler khác
}
```

### UI Design

```text
┌─────────────────────────────────────────────────┐
│ + │ Thêm công việc mới...  │ 👤 │ 📅 │        │
│   │ [input text]           │[dp]│[dt]│        │
└─────────────────────────────────────────────────┘
     ↑ input                  ↑     ↑
                         member  deadline
                         picker  picker
```

- 👤 click → dropdown danh sách member, chọn 1 người
- 📅 click → date picker popup
- Sau khi chọn, hiện badge nhỏ (tên member / ngày) bên cạnh input
- Enter hoặc click nút → tạo task + assign + deadline cùng lúc
- Escape → reset form

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/InlineTaskCreator.tsx` | Mới — inline form với member + deadline |
| `src/components/canvas/blocks/taskBlockTypes.ts` | Update `onAdd` signature |
| `src/components/canvas/blocks/TaskBlock.tsx` | Mở rộng `handleAddTask` với assign + deadline |
| `src/components/canvas/blocks/TaskListView.tsx` | Dùng `InlineTaskCreator` thay input cũ |
| `src/components/canvas/blocks/TaskKanbanView.tsx` | Dùng `InlineTaskCreator` thay input cũ |

### Không làm
- Assign nhiều member cùng lúc (chỉ 1 người khi inline create)
- Priority/label khi tạo inline
- Bulk task creation

