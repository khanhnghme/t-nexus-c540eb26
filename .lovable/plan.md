

## Phân tích nguyên nhân chính xác lỗi 429 sync_in_progress

### Nguyên nhân gốc (3 vấn đề)

**1. Lock bị kẹt vĩnh viễn khi edge function timeout/crash**

Khi edge function bị timeout (mặc định ~60s) hoặc crash giữa chừng, `releaseLock()` trong `finally` block không kịp chạy → `sync_locked_at` vẫn giữ giá trị cũ. Mặc dù có timeout 30s trong `acquireLock`, vấn đề nằm ở cách filter `.or()` xây dựng timestamp.

**2. Filter `.or()` trong `acquireLock` có thể parse sai**

```typescript
.or(`sync_locked_at.is.null,sync_locked_at.lt.${lockExpiry}`)
```

Biến `lockExpiry` là ISO string (vd: `2026-04-11T07:30:00.000Z`). Khi nối trực tiếp vào chuỗi `.or()`, dấu chấm `.` trong `.000Z` có thể bị PostgREST hiểu nhầm là delimiter, khiến filter không match → lock không bao giờ hết hạn → 429 mãi mãi.

**3. Không có guard `isSyncing` phía client**

```typescript
const sync = useCallback(async () => {
  if (!user?.id || !isConnected) return; // ← thiếu check isSyncing
  setIsSyncing(true);
```

User click nhanh 2 lần → 2 request đồng thời → request thứ 2 luôn bị 429.

---

### Kế hoạch fix

**1. Sửa `acquireLock` — dùng DB function thay vì `.or()` filter**

Tạo một database function `acquire_sync_lock(p_user_id, p_lock_timeout_seconds)` để xử lý lock an toàn bằng SQL thuần, tránh vấn đề PostgREST filter parsing:

```sql
CREATE OR REPLACE FUNCTION public.acquire_sync_lock(p_user_id UUID, p_timeout_seconds INT DEFAULT 30)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated_count INT;
BEGIN
  UPDATE google_calendar_tokens 
  SET sync_locked_at = now()
  WHERE user_id = p_user_id 
    AND (sync_locked_at IS NULL OR sync_locked_at < now() - (p_timeout_seconds || ' seconds')::interval)
  ;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END; $$;
```

**2. Sửa `releaseLock` — dùng DB function tương tự**

```sql
CREATE OR REPLACE FUNCTION public.release_sync_lock(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE google_calendar_tokens SET sync_locked_at = NULL WHERE user_id = p_user_id;
END; $$;
```

**3. Sửa edge function `google-calendar-sync/index.ts`**

- Thay `acquireLock()` bằng `supabase.rpc('acquire_sync_lock', { p_user_id: userId })`
- Thay `releaseLock()` bằng `supabase.rpc('release_sync_lock', { p_user_id: userId })`
- Đảm bảo `releaseLock` vẫn nằm trong `finally` block

**4. Sửa `useGoogleCalendarSync.ts` — thêm guard**

```typescript
const sync = useCallback(async () => {
  if (!user?.id || !isConnected || isSyncing) return; // thêm isSyncing
  setIsSyncing(true);
  // ...
}, [user?.id, isConnected, isSyncing]); // thêm isSyncing vào deps
```

**5. Clear lock hiện tại — migration SQL**

```sql
UPDATE public.google_calendar_tokens SET sync_locked_at = NULL;
```

### Files cần sửa

| File | Thay đổi |
|------|----------|
| Migration SQL | Tạo 2 DB functions + clear stale locks |
| `supabase/functions/google-calendar-sync/index.ts` | Dùng RPC thay `.or()` filter |
| `src/hooks/useGoogleCalendarSync.ts` | Thêm `isSyncing` guard |

### Kết quả sau fix
- Lock không bao giờ bị kẹt vĩnh viễn (DB function xử lý timestamp so sánh chính xác)
- Client ngăn double-click gửi 2 request
- Lock tự hết hạn sau 30s dù edge function crash

