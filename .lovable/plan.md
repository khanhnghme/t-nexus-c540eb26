

## Giai đoạn 2: Database + Backend Logic cho Upgrade/Downgrade

### Tổng quan
Thêm cột mới vào `profiles`, sửa logic `capture-paypal-order` để phân biệt upgrade vs downgrade, tạo edge function mới `process-plan-cycle` để tự động chuyển gói khi hết chu kỳ, và cập nhật admin hook.

---

### 1. Database Migration — Thêm cột `next_plan` và `next_billing_cycle`

```sql
ALTER TABLE public.profiles
  ADD COLUMN next_plan text DEFAULT NULL,
  ADD COLUMN next_billing_cycle text DEFAULT NULL;
```

Hai cột này lưu gói đã lên lịch (downgrade) và chu kỳ thanh toán tương ứng. Khi `plan_expires_at` hết hạn, `process-plan-cycle` sẽ đọc và áp dụng.

---

### 2. Sửa `supabase/functions/capture-paypal-order/index.ts`

Thêm `PLAN_RANK` map và phân nhánh logic tại block "PLAN ORDER" (line 187-243):

- **Thêm rank map** ở đầu file:
  ```
  PLAN_RANK = { plan_free: 0, plan_plus: 1, plan_pro: 2, plan_business: 3, plan_custom: 4 }
  ```

- **Fetch profile hiện tại** (đã có ở line 196-201) — thêm lấy `next_plan`

- **So sánh rank**:
  - `newRank > oldRank` hoặc `oldPlan === 'plan_free'` → **UPGRADE**: giữ nguyên logic hiện tại (đổi plan ngay, reset chu kỳ, update workspace limits)
  - `newRank < oldRank` → **DOWNGRADE**: 
    - KHÔNG đổi `user_plan`
    - Set `next_plan = order.plan`, `next_billing_cycle = order.billing_cycle`
    - Giữ nguyên `plan_expires_at` cũ
    - Log `action_type = 'downgrade_scheduled'`
  - `newRank === oldRank` → **RENEW**: giữ logic hiện tại

- **Đổi ý** (profile đã có `next_plan`): ghi đè `next_plan` mới, log `action_type = 'change_scheduled_plan'`

---

### 3. Tạo `supabase/functions/process-plan-cycle/index.ts` (MỚI)

Edge function chạy theo lịch (cron daily 3:00 AM UTC), xử lý:

1. Query `profiles` có `next_plan IS NOT NULL AND plan_expires_at <= now()`
2. Với mỗi profile:
   - Đổi `user_plan = next_plan`, `plan = next_plan`
   - Reset `plan_started_at = now()`, `plan_expires_at = now() + 30 ngày` (hoặc 1 năm nếu `next_billing_cycle = 'yearly'`)
   - Xóa `next_plan = NULL`, `next_billing_cycle = NULL`
   - Update workspace limits theo `plan_limits`
   - Log vào `plan_change_logs` với `action_type = 'cycle_transition'`
3. Nếu không có `next_plan` → xử lý bình thường (về free nếu hết hạn + không auto_renew)

**Cron setup** (dùng pg_cron + pg_net):
```sql
SELECT cron.schedule('process-plan-cycle-daily', '0 3 * * *', $$
  SELECT net.http_post(
    url:='https://xrlczmzgxlmdavhbwsah.supabase.co/functions/v1/process-plan-cycle',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{"time":"' || now() || '"}'::jsonb
  ) as request_id;
$$);
```

---

### 4. Sửa `src/hooks/useAdminPlanActions.ts`

Cập nhật case `downgrade` (line 56-73):
- Nếu `newPlan !== 'plan_free'`: set `next_plan` + `next_billing_cycle` thay vì đổi plan ngay, log `action_type = 'downgrade_scheduled'`
- Nếu `newPlan === 'plan_free'`: giữ logic hiện tại (đổi ngay về free)

---

### 5. Cập nhật `src/types/database.ts` — Profile interface

Thêm 2 field:
```ts
next_plan: string | null;
next_billing_cycle: string | null;
```

---

### Tóm tắt files

| File | Hành động |
|------|-----------|
| Migration SQL | Thêm 2 cột `next_plan`, `next_billing_cycle` vào profiles |
| `capture-paypal-order/index.ts` | Phân nhánh upgrade/downgrade/renew/đổi ý |
| `process-plan-cycle/index.ts` | **MỚI** — cycle transition + cron |
| `src/hooks/useAdminPlanActions.ts` | Downgrade → set next_plan |
| `src/types/database.ts` | Thêm 2 fields Profile |
| pg_cron SQL (insert tool) | Schedule daily job |

### Không thay đổi
- Không sửa UI/UX (để Giai đoạn 3)
- Không sửa PricingDocs, Checkout, Upgrade pages
- Chapter 1, 2, 3 giữ nguyên

