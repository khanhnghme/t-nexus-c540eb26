

## Phase 7 — Giai đoạn 1/4: Custom Block `/calendar` — Mini Calendar hiển thị Task Deadlines (Read-only)

### Bối cảnh
Phase 6 hoàn thành block `/member`. Phase 7 theo roadmap là block `/calendar` — hiển thị deadline các tasks dưới dạng mini calendar trong canvas.

Giai đoạn 1/4 tập trung vào: tạo khung block, fetch tasks có deadline theo `group_id`, render mini calendar với dots đánh dấu ngày có deadline.

### Hiện trạng
- `react-day-picker` đã có trong deps, component `Calendar` (`src/components/ui/calendar.tsx`) đã tồn tại
- `TaskBlockContext` cung cấp `groupId` + `editable` — reuse cho calendar block
- Bảng `tasks` có cột `deadline` (timestamp)
- Chưa có `CalendarBlock.tsx`

### Hành động cụ thể

**1. Tạo `src/components/canvas/blocks/CalendarBlock.tsx`**
- Import `useTaskBlockContext` để lấy `groupId`
- Fetch tasks có deadline từ bảng `tasks` theo `group_id` (chỉ lấy `id`, `title`, `deadline`, `status`)
- Render mini calendar dùng `DayPicker` từ `react-day-picker`
- Đánh dấu ngày có deadline bằng dot/highlight
- Hover/click vào ngày → hiện tooltip danh sách tasks deadline ngày đó
- Block header: icon Calendar + "Lịch deadline" + count tasks
- Read-only — không cho tạo/sửa task từ block này

**2. Đăng ký block trong `CanvasEditor.tsx`**
- Import `CalendarBlock`, thêm `calendarView: CalendarBlock()` vào schema

### Chi tiết kỹ thuật

```text
Block layout:
┌──────────────────────────────────┐
│ 📅 Lịch deadline          [12]  │
├──────────────────────────────────┤
│      << Tháng 4, 2026 >>        │
│  CN  T2  T3  T4  T5  T6  T7    │
│           1   2   3   4         │
│   5   6   7   8   9• 10  11    │
│  12  13  14• 15  16  17  18    │
│  ...                            │
│                                  │
│  • = ngày có task deadline       │
│  Hover → tooltip: "Task A, B"   │
└──────────────────────────────────┘

Data flow:
  groupId (context) → supabase.from("tasks")
    .select("id, title, deadline, status")
    .eq("group_id", groupId)
    .not("deadline", "is", null)
  → group by date → render dots on DayPicker
```

### Không làm trong giai đoạn này
- Realtime subscription (giai đoạn 2)
- Month/Week view toggle (giai đoạn 3)
- Click ngày để tạo task (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/CalendarBlock.tsx` | Tạo mới — custom block hiển thị mini calendar |
| `src/components/canvas/CanvasEditor.tsx` | Đăng ký `calendarView` block vào schema |

### Rủi ro
- `DayPicker` component có sẵn nhưng cần custom `modifiers` để đánh dấu ngày có deadline
- Performance: chỉ fetch tasks có deadline, không load toàn bộ tasks

