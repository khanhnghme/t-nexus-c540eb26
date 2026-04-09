

## Plan: Triển khai giới hạn nhật ký hoạt động & tự động xóa log cũ

### Hiện trạng
- Trang Pricing đã hiển thị: Free = không có, Plus = 30 ngày, Pro/Business = Không giới hạn
- Bảng `plan_limits` **chưa có** cột lưu giới hạn ngày nhật ký
- `logActivity()` ghi log mà không kiểm tra giới hạn
- Không có cơ chế tự động xóa log cũ

### Thay đổi

**1. Migration — thêm cột `max_activity_log_days` vào `plan_limits`**
```sql
ALTER TABLE plan_limits ADD COLUMN max_activity_log_days integer;
UPDATE plan_limits SET max_activity_log_days = 0 WHERE plan = 'plan_free';    -- không ghi log
UPDATE plan_limits SET max_activity_log_days = 30 WHERE plan = 'plan_plus';   -- 30 ngày
-- Pro, Business, Custom = NULL (unlimited)
```

**2. `activityLogger.ts` — kiểm tra limit trước khi ghi + tự động xóa log cũ**
- Trước khi insert, tra `plan_limits` qua workspace → owner → plan
- Nếu `max_activity_log_days = 0` → không ghi log (Free plan)
- Nếu `max_activity_log_days > 0` → ghi log + xóa các log cũ hơn N ngày của group đó
- Nếu `max_activity_log_days = NULL` → ghi log, không xóa (unlimited)

Logic xóa tự động:
```typescript
// Sau khi insert thành công, xóa log cũ quá hạn
if (maxDays && groupId) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  await supabase.from('activity_logs')
    .delete()
    .eq('group_id', groupId)
    .lt('created_at', cutoff.toISOString());
}
```

**3. `usePlanLimits.ts` — thêm `maxActivityLogDays`**
- Thêm field vào interface + fetch logic

**4. UI — hiển thị cảnh báo tại `ProjectActivityLog.tsx`**
- Nếu có limit (Plus = 30 ngày): hiển thị info banner "Nhật ký chỉ lưu giữ 30 ngày gần nhất theo gói Plus"
- Nếu Free (limit = 0): hiển thị cảnh báo "Gói Free không hỗ trợ nhật ký hoạt động. Nâng cấp để sử dụng."
- Nếu unlimited: không hiển thị gì

**5. i18n (`en.ts`, `vi.ts`) — thêm chuỗi**
- Cảnh báo Free không hỗ trợ
- Thông báo giới hạn N ngày
- Gợi ý nâng cấp

### Files

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm cột `max_activity_log_days` + seed data |
| `src/lib/activityLogger.ts` | Check limit trước khi ghi, xóa log cũ quá hạn |
| `src/hooks/usePlanLimits.ts` | Thêm `maxActivityLogDays` |
| `src/components/ProjectActivityLog.tsx` | Banner cảnh báo theo limit |
| `src/lib/i18n/en.ts` | Thêm chuỗi activity log limit |
| `src/lib/i18n/vi.ts` | Thêm chuỗi activity log limit |

