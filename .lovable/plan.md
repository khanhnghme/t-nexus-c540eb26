

## Phase 5 — Kanban + Task Detail + Project Calendar: Giai đoạn 3/4 (UI Design & Build)

Giai đoạn 1-2 hoàn thành: database (`task_attachments` + storage) và logic hooks (`useKanbanBoard`, `useTaskAttachments`, `useProjectCalendar`). Giai đoạn 3 tập trung **build UI components**.

**Lưu ý**: Build error `@/hooks/useAuth` hiện tại là stale — code đã đúng `@/contexts/AuthContext`. Sẽ được fix kèm trong lần build này.

### Thay đổi

**1. Tạo `src/components/kanban/KanbanBoard.tsx` — Main Kanban component**
- Nhận `groupId` prop, sử dụng `useKanbanBoard` hook
- Render 4 cột: TODO, IN_PROGRESS, DONE, VERIFIED với header + count badge
- Mỗi cột chứa danh sách `KanbanCard`
- Hỗ trợ drag & drop giữa các cột (dùng HTML5 native drag API hoặc đơn giản hơn: dropdown chuyển status trên mỗi card)
- Loading skeleton khi fetch data

**2. Tạo `src/components/kanban/KanbanCard.tsx` — Task card trong Kanban**
- Hiển thị: title, deadline (color-coded nếu quá hạn), assignee avatars, stage badge
- Click vào card → navigate đến task detail
- Dropdown/button để quick-move status (gọi `moveTask`)
- Style: Card nhỏ gọn, border-left color theo status
- Ẩn task có `is_hidden = true` (hoặc hiển thị mờ)

**3. Tạo `src/components/kanban/KanbanColumn.tsx` — Wrapper cho mỗi cột**
- Header với tên status (Vietnamese) + task count
- Scrollable container cho cards
- Drop zone styling khi drag over
- Empty state message

**4. Tạo `src/components/task-detail/TaskAttachments.tsx` — File attachment UI**
- Nhận `taskId`, `canEdit` props, sử dụng `useTaskAttachments` hook
- Upload zone (click hoặc drag file) — hiển thị khi `canEdit`
- Danh sách attachments: icon theo file type, tên file, size, uploader, ngày upload
- Download button (dùng `getSignedUrl`)
- Delete button (chỉ hiển thị cho uploader hoặc leader)
- Loading/uploading states

**5. Tạo `src/components/calendar/ProjectCalendarView.tsx` — Calendar embed cho project**
- Nhận `groupId` prop, sử dụng `useProjectCalendar` hook
- Re-use các calendar sub-components đã có: `CalendarMonthView`, `CalendarWeekView`, `CalendarDayView`, `CalendarHeader`
- Simplified version: chỉ hiển thị task deadlines của project (không có personal events, không có Google sync)
- Click event → navigate đến task detail

**6. Tạo `src/components/kanban/index.ts` — Barrel export**

### Chi tiết kỹ thuật

- KanbanBoard: grid layout `grid-cols-4` trên desktop, scroll horizontal trên mobile
- KanbanCard: sử dụng `UserAvatar` component có sẵn cho assignee avatars
- TaskAttachments: file size format (KB/MB), MIME type icon mapping
- ProjectCalendarView: re-use `CalendarHeader` cho navigation (prev/next month, view mode toggle)
- Tất cả components sử dụng shadcn/ui primitives (Card, Badge, Button, ScrollArea)

### Không thay đổi database
### Không thay đổi logic hooks (đã hoàn thành ở giai đoạn 2)

### Files cần tạo

| File | Thay đổi |
|------|----------|
| `src/components/kanban/KanbanBoard.tsx` | **Tạo mới** — Main Kanban grid |
| `src/components/kanban/KanbanColumn.tsx` | **Tạo mới** — Column wrapper |
| `src/components/kanban/KanbanCard.tsx` | **Tạo mới** — Task card |
| `src/components/kanban/index.ts` | **Tạo mới** — Barrel export |
| `src/components/task-detail/TaskAttachments.tsx` | **Tạo mới** — Attachment upload/list UI |
| `src/components/calendar/ProjectCalendarView.tsx` | **Tạo mới** — Embedded project calendar |

