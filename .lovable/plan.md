

## Kế hoạch: Tích hợp Google Calendar 2-Way Sync

### Bước 1: Lưu Secrets
Yêu cầu bạn nhập 2 secrets:
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`

### Bước 2: Database Migration
Tạo 2 bảng mới:

**`google_calendar_tokens`** — Lưu OAuth token per user
- `id`, `user_id` (FK profiles), `access_token`, `refresh_token`, `expires_at`, `calendar_id`, `created_at`, `updated_at`
- RLS: user chỉ truy cập token của mình

**`calendar_sync_map`** — Map event nội bộ ↔ Google event
- `id`, `user_id`, `local_event_id`, `local_event_type` (task/personal), `google_event_id`, `google_calendar_id`, `last_synced_at`
- RLS: user chỉ truy cập sync map của mình

### Bước 3: Edge Functions (3 functions)

1. **`google-calendar-auth`** — Tạo OAuth URL, redirect user tới Google consent screen
2. **`google-calendar-callback`** — Nhận authorization code, exchange lấy tokens, lưu DB, redirect về `/calendar?gcal=connected`
3. **`google-calendar-sync`** — Sync 2 chiều:
   - **Push**: personal_events + tasks có deadline → tạo/update Google Calendar events
   - **Pull**: Google Calendar events → tạo personal_events mới
   - Auto refresh access_token khi hết hạn
   - Dùng `calendar_sync_map` tránh duplicate

### Bước 4: Frontend

- **`GoogleCalendarConnect.tsx`** — Component nút kết nối/ngắt kết nối + trạng thái
- **`useGoogleCalendarSync.ts`** — Hook quản lý sync (check connected, trigger sync, auto-sync khi mở calendar)
- **`CalendarHeader.tsx`** — Thêm nút Google Calendar vào header
- **`Calendar.tsx`** — Tích hợp hook, sync khi tạo/sửa/xóa event
- Google events hiển thị với icon Google nhỏ để phân biệt

### Files tạo mới
| File | Mô tả |
|------|--------|
| `supabase/functions/google-calendar-auth/index.ts` | OAuth flow init |
| `supabase/functions/google-calendar-callback/index.ts` | OAuth callback |
| `supabase/functions/google-calendar-sync/index.ts` | 2-way sync logic |
| `src/components/calendar/GoogleCalendarConnect.tsx` | UI kết nối |
| `src/hooks/useGoogleCalendarSync.ts` | Sync hook |

### Files sửa
| File | Thay đổi |
|------|----------|
| `src/components/calendar/CalendarHeader.tsx` | Thêm nút Google Calendar |
| `src/pages/Calendar.tsx` | Tích hợp sync hook |
| `src/types/calendar.ts` | Thêm field `googleEventId`, `isFromGoogle` |

### Thứ tự thực hiện
1. Yêu cầu nhập 2 secrets
2. Tạo migration cho 2 bảng
3. Tạo 3 edge functions
4. Cập nhật frontend

