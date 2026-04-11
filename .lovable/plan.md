

## Phase 7 — Giai đoạn 2/4: Realtime Subscribe cho Calendar Block

### Mục tiêu
Tự động cập nhật mini calendar khi tasks có deadline được thêm/sửa/xóa, không cần reload.

### Hiện trạng
- Stage 1/4 hoàn thành: CalendarBlock fetch tasks 1 lần khi mount, render dots
- Bảng `tasks` đã enable realtime (từ Phase 5 cho TaskBlock)

### Hành động

**Cập nhật `src/components/canvas/blocks/CalendarBlock.tsx`**
- Thêm `useEffect` subscribe realtime channel trên bảng `tasks` với filter `group_id=eq.${groupId}`
- Khi nhận event (INSERT/UPDATE/DELETE) → gọi lại `fetchTasks()`
- Cleanup: `supabase.removeChannel(channel)` khi unmount

### Chi tiết kỹ thuật

```typescript
useEffect(() => {
  if (!groupId) return;
  const channel = supabase
    .channel(`calendar-tasks-${groupId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `group_id=eq.${groupId}`
    }, () => fetchTasks())
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [groupId, fetchTasks]);
```

### Không làm
- Month/Week view toggle (giai đoạn 3)
- Click ngày để tạo task (giai đoạn 4)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/canvas/blocks/CalendarBlock.tsx` | Thêm realtime subscription |

