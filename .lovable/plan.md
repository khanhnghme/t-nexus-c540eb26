

## Plan: Đếm ngược thời gian họp theo limit gói cước & tự động kết thúc

### Hiện trạng
- `MeetingRoom.tsx` đã có timer đếm **thời gian đã trôi** (`elapsed`) khi meeting `in_progress`
- Chưa có cột `max_meeting_duration_minutes` trong `plan_limits`
- Không có cơ chế đếm ngược hay tự động kết thúc khi hết limit

### Thay đổi

**1. Migration — thêm cột `max_meeting_duration_minutes`**
```sql
ALTER TABLE plan_limits ADD COLUMN max_meeting_duration_minutes integer;
UPDATE plan_limits SET max_meeting_duration_minutes = 15 WHERE plan = 'plan_free';
UPDATE plan_limits SET max_meeting_duration_minutes = 60 WHERE plan = 'plan_plus';
-- Pro, Business, Custom = NULL (unlimited)
```

**2. `usePlanLimits.ts` — thêm `maxMeetingDurationMinutes`**
- Thêm field vào interface + fetch logic

**3. `CreateMeetingDialog.tsx` — lọc thời lượng theo limit**
- Chỉ hiển thị các option thời lượng ≤ limit (nếu có limit)
- Hiển thị cảnh báo nâng cấp nếu bị giới hạn

**4. `MeetingRoom.tsx` — đếm ngược & tự động kết thúc**
- Khi meeting `in_progress` và có limit:
  - Tính `remaining = limitMinutes * 60 - elapsedSeconds`
  - Hiển thị badge đếm ngược bên cạnh badge `elapsed` hiện có (VD: "Còn 05:30")
  - Khi remaining ≤ 5 phút → badge chuyển đỏ + cảnh báo
  - Khi remaining ≤ 0 → tự động gọi `handleEndMeeting()` + toast thông báo "Cuộc họp đã tự động kết thúc do hết thời lượng gói cước"
- Nếu limit = null (unlimited) → không hiển thị đếm ngược, không tự động tắt

**5. i18n (`en.ts`, `vi.ts`)**
- Thêm chuỗi: cảnh báo sắp hết giờ, thông báo tự động kết thúc, giới hạn thời lượng tạo họp

### UI khi đang họp (có limit)

```text
[LIVE] [00:12:30] [Còn 02:30 ⚠️]     ← badge đếm ngược màu đỏ khi < 5 phút
```

Khi hết giờ → auto end + toast + redirect về danh sách.

### Files
| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm cột `max_meeting_duration_minutes` |
| `src/hooks/usePlanLimits.ts` | Thêm `maxMeetingDurationMinutes` |
| `src/components/MeetingRoom.tsx` | Đếm ngược remaining, auto-end khi hết giờ |
| `src/components/CreateMeetingDialog.tsx` | Lọc options thời lượng, hiển thị cảnh báo |
| `src/lib/i18n/en.ts` | Thêm chuỗi meeting limit |
| `src/lib/i18n/vi.ts` | Thêm chuỗi meeting limit |

