

## Phase 17 — Mobile Responsive

### Mục tiêu
Canvas hoạt động tốt trên mobile/tablet: sidebar thành drawer, task block chuyển card view, member block responsive grid, touch-friendly controls.

### Hiện trạng
- `useIsMobile()` hook đã có và đang dùng trong `CanvasPageView.tsx` (auto-close sidebar on mobile)
- Sidebar width cứng `w-[220px]` / `max-md:w-[180px]`, không có drawer mode
- Task list view dùng table-like row layout, chưa responsive cho mobile
- Kanban view dùng horizontal columns, overflow trên mobile
- Member block grid cứng `grid-cols-3`
- `CanvasPageView` wrapper layout dùng `flex` không có mobile adaptation ngoài sidebar auto-close

### Công việc

**1. Sidebar → Sheet/Drawer trên mobile**

Trong `CanvasPageView.tsx`:
- Khi `isMobile`, render `CanvasSidebar` bên trong `Sheet` (từ shadcn) thay vì inline flex
- Toggle button mở Sheet, chọn page → auto đóng Sheet
- Desktop giữ nguyên behavior hiện tại

**2. Task List View — Card layout trên mobile**

Trong `TaskListView.tsx`:
- Detect mobile via `useIsMobile()`
- Mobile: render mỗi task dạng card (title + status badge + assignee + deadline stacked vertically)
- Desktop: giữ nguyên row layout hiện tại
- Hiện assignee và deadline trên mobile (hiện tại đang `hidden sm:flex`)

**3. Kanban View — Vertical stack trên mobile**

Trong `TaskKanbanView.tsx`:
- Mobile: columns stack dọc thay vì flex-row, mỗi column full width
- Hoặc horizontal scroll với snap points
- Touch drag: đảm bảo native drag events hoạt động trên touch

**4. Member Block — Responsive grid**

Trong `MemberBlock.tsx`:
- Grid mode: `grid-cols-2` trên mobile, `grid-cols-3` trên desktop
- List mode: giữ nguyên (đã OK)

**5. Header bar responsive**

Trong `CanvasPageView.tsx` header bar (line 223):
- Mobile: ẩn text labels, chỉ hiện icons cho Edit/View và Template buttons
- Wrap overflow nếu cần

**6. InlineTaskCreator responsive**

- Mobile: stack controls vertical thay vì inline row
- Date picker và member picker đủ lớn để touch

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/CanvasPageView.tsx` | Sidebar → Sheet trên mobile, header responsive |
| `src/components/canvas/CanvasSidebar.tsx` | Thêm prop/variant cho drawer mode |
| `src/components/canvas/blocks/TaskListView.tsx` | Card layout trên mobile |
| `src/components/canvas/blocks/TaskKanbanView.tsx` | Vertical stack trên mobile |
| `src/components/canvas/blocks/MemberBlock.tsx` | Responsive grid cols |
| `src/components/canvas/blocks/InlineTaskCreator.tsx` | Touch-friendly layout |

### Không làm
- PWA / offline support
- Native app wrapper
- Gesture navigation (swipe between pages)

