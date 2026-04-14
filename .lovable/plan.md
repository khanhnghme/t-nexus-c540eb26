

## Plan: Cập nhật hạn mức AI theo gói + UI

### Tóm tắt
- Free: 5, Plus: 20, Pro: 50, Business: **150** (giảm từ 200), Enterprise: giữ unlimited
- Cập nhật DB `plan_limits` + tất cả UI liên quan

### Chi tiết

**1. Cập nhật DB `plan_limits` (dùng insert tool)**
```sql
UPDATE plan_limits SET max_ai_messages_per_day = 5 WHERE plan = 'plan_free';
UPDATE plan_limits SET max_ai_messages_per_day = 20 WHERE plan = 'plan_plus';
UPDATE plan_limits SET max_ai_messages_per_day = 50 WHERE plan = 'plan_pro';
UPDATE plan_limits SET max_ai_messages_per_day = 150 WHERE plan = 'plan_business';
-- plan_custom (Enterprise) giữ NULL = unlimited
```

**2. Cập nhật `src/lib/i18n/en.ts`**
- Business quotas (line 358): `'Unlimited AI Assistant'` → `'AI Assistant: 150 messages/day'`
- Comparison table (line 422): `business: 'Unlimited'` → `business: '150/day'`

**3. Cập nhật `src/lib/i18n/vi.ts`**
- Business quotas (line 359): `'Trợ lý AI không giới hạn'` → `'Trợ lý AI: 150 lượt/ngày'`
- Comparison table (line 424): `business: 'Không giới hạn'` → `business: '150/ngày'`

### Tổng: 1 data update + 2 files sửa

