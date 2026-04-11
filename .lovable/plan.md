

## Phase 5 — Kanban + Task Detail + Project Calendar: Giai đoạn 4/4 (Integration)

Giai đoạn 1-3 hoàn thành: database, logic hooks, UI components. Giai đoạn 4 tập trung **tích hợp vào pages thực tế, i18n, và polish**.

### Thay đổi

**1. Tích hợp Kanban + Calendar vào `GroupDetail.tsx`**
- Mở rộng `taskViewMode` từ `'list' | 'table'` thành `'list' | 'table' | 'kanban' | 'calendar'`
- Thêm 2 toggle buttons mới (Kanban icon + Calendar icon) vào toolbar hiện tại (dòng 695-714)
- Render `KanbanBoardView` khi `taskViewMode === 'kanban'`, truyền `groupId`, `canEdit`, `onClickTask` (navigate đến task detail)
- Render `ProjectCalendarView` khi `taskViewMode === 'calendar'`, truyền `groupId`, `projectSlug`
- Import `KanbanBoardView`, `ProjectCalendarView`, thêm icons `LayoutGrid`, `CalendarDays`

**2. Tích hợp TaskAttachments vào `TaskDetail.tsx`**
- Import và render `TaskAttachments` component sau phần submission link (dòng ~190)
- Truyền `taskId`, `canEdit`, `isLeader: isLeaderInGroup`
- Hiển thị cho tất cả users (view), chỉ canEdit mới upload được

**3. Thêm i18n translations**
- `src/lib/i18n/vi.ts`: Thêm block `kanban` + `taskAttachments` + `projectCalendar`
- `src/lib/i18n/en.ts`: Tương ứng English translations
- Labels: view mode tooltips, empty states, upload/download text

**4. i18n hóa các components đã tạo ở giai đoạn 3**
- `KanbanBoardView.tsx` / `KanbanColumn.tsx` / `KanbanCard.tsx`: Sử dụng `useLanguage()` cho status labels, empty states
- `TaskAttachments.tsx`: i18n cho upload zone text, delete confirm, file size labels
- `ProjectCalendarView.tsx`: i18n cho header text

**5. Kanban click → task detail navigation**
- `onClickTask` callback trong `KanbanBoardView`: navigate đến `/p/{projectSlug}/tasks/{taskSlug}` hoặc fallback `/groups/{groupId}/tasks/{taskId}`

### Chi tiết kỹ thuật

- `taskViewMode` state default vẫn là `'list'` (không breaking change)
- KanbanBoardView invalidate `['task-table', groupId]` khi move → tự sync với Table view
- TaskAttachments bucket `task-attachments` đã private → dùng `getSignedUrl` cho download

### Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/GroupDetail.tsx` | Thêm kanban/calendar toggle + render components |
| `src/pages/TaskDetail.tsx` | Thêm TaskAttachments section |
| `src/lib/i18n/vi.ts` | Thêm kanban, taskAttachments, projectCalendar translations |
| `src/lib/i18n/en.ts` | Tương ứng English |
| `src/components/kanban/KanbanBoardView.tsx` | i18n labels |
| `src/components/kanban/KanbanColumn.tsx` | i18n empty state |
| `src/components/kanban/KanbanCard.tsx` | i18n status labels |
| `src/components/task-detail/TaskAttachments.tsx` | i18n text |
| `src/components/calendar/ProjectCalendarView.tsx` | i18n header |

