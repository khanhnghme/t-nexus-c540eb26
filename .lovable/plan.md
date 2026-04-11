

## Fix Spam Sự Kiện + Hiển Thị Mã Sự Kiện

### Nguyên nhân gốc spam

Dữ liệu hiện tại: **47 external events** trong `personal_events`, nhiều event bị trùng 2-3 lần (cùng title, khác `google_event_id`). Nguyên nhân:

1. **Tasks bị push nhiều lần ra Google** — Các lần sync trước (trước khi có fix idempotent) đã tạo nhiều Google Calendar events cho cùng 1 task
2. **PULL kéo lại các event trùng** — Mỗi Google event có ID riêng, nên PULL tạo personal_event mới cho mỗi bản trùng
3. **PULL không nhận diện event từ task** — Khi Google trả về event có title `[ProjectName] TaskTitle`, PULL không biết đây là task đã push, vẫn tạo personal_event

### Kế hoạch fix — 2 phần

---

### Phần 1: Dọn dẹp dữ liệu + Fix logic Edge Function

**1.1 Dọn dữ liệu duplicate** (dùng insert tool)
- Xóa personal_events trùng lặp (giữ bản mới nhất cho mỗi `google_event_id` group by title+start_time)
- Xóa sync_map entries tương ứng

**1.2 Sửa Edge Function PULL logic** (`google-calendar-sync/index.ts`)

Thêm bước nhận diện event đã push từ task: trước khi tạo personal_event mới, check sync_map xem google_event_id có thuộc task nào không (vì task push tạo sync_map entry với `local_event_type: 'task'`). Hiện tại code chỉ check `allKnownGoogleIds` Set nhưng Set này build từ sync_map nên lẽ ra phải hoạt động — vấn đề là các lần sync cũ tạo Google events mà không có sync_map entry.

Fix thực tế: Trong PULL, sau khi check `allKnownGoogleIds`, thêm check title pattern — nếu title bắt đầu bằng `[` và match pattern `[ProjectName] TaskTitle`, skip event đó (vì nó là task đã push).

**1.3 Thêm `google_event_id` column vào `personal_events`** (Migration)

Thêm cột `google_event_id TEXT` nullable vào `personal_events` để lưu trực tiếp mapping, giúp query đơn giản hơn và hiển thị trên UI.

---

### Phần 2: Nâng cấp UI hiển thị mã sự kiện

**2.1 `CalendarEvent` type** — Thêm `googleEventId?: string`

**2.2 Query Calendar.tsx** — Map `google_event_id` từ personal_events query

**2.3 EventDetailDialog** — Hiển thị:
- Mã sự kiện nội bộ (UUID rút gọn 8 ký tự)
- Mã Google Event ID (nếu có) với icon copy

**2.4 CalendarTaskDetailDialog** — Hiển thị mã task ID

---

### Files cần sửa

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm `google_event_id` vào `personal_events` |
| Data cleanup SQL | Xóa duplicate events + sync_map |
| `supabase/functions/google-calendar-sync/index.ts` | Skip task-originated events trong PULL, lưu `google_event_id` vào personal_events |
| `src/types/calendar.ts` | Thêm `googleEventId` |
| `src/pages/Calendar.tsx` | Map `google_event_id` |
| `src/components/calendar/EventDetailDialog.tsx` | Hiển thị mã ID + copy button |
| `src/components/calendar/CalendarTaskDetailDialog.tsx` | Hiển thị mã task ID |

