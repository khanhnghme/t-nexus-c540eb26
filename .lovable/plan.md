

## Fix Duplicate Event khi Sync 2 chiều — Chia 2 giai đoạn

### Phân tích vấn đề hiện tại

1. **PULL tạo duplicate**: Khi PULL từ Google, chỉ check `allKnownGoogleIds` (in-memory Set). Nếu sync chạy nhiều lần hoặc có race condition, event có thể bị tạo lại.
2. **Không có `source` column**: `personal_events` không phân biệt event tạo từ nội bộ vs kéo từ Google → dễ tạo loop sync.
3. **Không có lock/debounce**: Nhiều request sync đồng thời có thể gây race condition.
4. **PULL không update event đã tồn tại**: Chỉ skip hoặc create, không update khi Google event thay đổi.

---

## Giai đoạn 1: Database + Logic (Edge Function)

### 1.1 Migration — Thêm cột `source` vào `personal_events`

```sql
ALTER TABLE public.personal_events 
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal'
  CHECK (source IN ('internal', 'external'));
```

### 1.2 Migration — Thêm cột `sync_lock` vào `google_calendar_tokens`

```sql
ALTER TABLE public.google_calendar_tokens 
  ADD COLUMN IF NOT EXISTS sync_locked_at TIMESTAMPTZ DEFAULT NULL;
```

Dùng để ngăn 2 sync request chạy đồng thời (optimistic lock — check `sync_locked_at < now() - 30s`).

### 1.3 Sửa Edge Function `google-calendar-sync/index.ts`

**Lock mechanism** — Trước khi sync:
```typescript
// Acquire lock: chỉ cho phép sync nếu không có lock hoặc lock đã hết hạn (30s)
const { data: lockResult } = await supabase
  .from("google_calendar_tokens")
  .update({ sync_locked_at: new Date().toISOString() })
  .eq("user_id", userId)
  .or(`sync_locked_at.is.null,sync_locked_at.lt.${new Date(Date.now() - 30000).toISOString()}`)
  .select("id");

if (!lockResult?.length) {
  return Response("Sync đang chạy, vui lòng đợi", 429);
}
// Release lock khi hoàn thành (finally block)
```

**PULL phase — Idempotent upsert thay vì insert**:
- Trước khi tạo personal_event mới, check `calendar_sync_map` bằng `google_event_id` (unique constraint đã có).
- Nếu đã tồn tại → UPDATE `personal_events` (title, description, start_time, end_time).
- Nếu chưa tồn tại → INSERT với `source: 'external'`.

**PUSH phase — Skip external events**:
- Khi push personal events, thêm filter `.eq('source', 'internal')` để không đẩy lại event kéo từ Google.

**Release lock** trong `finally` block.

### Kết quả giai đoạn 1
- Sync nhiều lần = idempotent (không duplicate)
- Lock ngăn race condition
- `source` column ngăn loop sync (internal ↔ external)
- PULL update event đã tồn tại thay vì skip

---

## Giai đoạn 2: Nâng cấp UI

### 2.1 Hiển thị source trên event

**`CalendarEvent` type** — Thêm `source?: 'internal' | 'external'`.

**Query `personalEvents`** — Select thêm `source` column, map vào `CalendarEvent`.

**`EventDetailDialog`** — Hiển thị badge:
- `internal` → Badge "Sự kiện nội bộ" (icon Calendar)
- `external` → Badge "Google Calendar" (icon Google logo) với màu xanh Google (#4285f4)

**`CalendarMonthView` / `CalendarWeekView` / `CalendarDayView`** — Hiển thị small Google icon bên cạnh title cho event external.

### 2.2 Hiển thị sync ID

**`EventDetailDialog`** — Thêm dòng hiển thị Google Event ID (nếu có) dưới dạng text nhỏ mờ, giúp debug và xác nhận mapping.

### Files cần sửa

| Giai đoạn | File | Thay đổi |
|-----------|------|----------|
| 1 | Migration SQL | Thêm `source` column + `sync_locked_at` column |
| 1 | `supabase/functions/google-calendar-sync/index.ts` | Lock, idempotent PULL, skip external PUSH |
| 2 | `src/types/calendar.ts` | Thêm `source` vào `CalendarEvent` |
| 2 | `src/pages/Calendar.tsx` | Map `source` từ query |
| 2 | `src/components/calendar/EventDetailDialog.tsx` | Badge source + Google Event ID |
| 2 | `src/components/calendar/CalendarMonthView.tsx` | Google icon cho external event |
| 2 | `src/components/calendar/CalendarWeekView.tsx` | Google icon cho external event |
| 2 | `src/components/calendar/CalendarDayView.tsx` | Google icon cho external event |

