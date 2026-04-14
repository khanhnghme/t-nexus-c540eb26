

## Plan: Giảm hạn mức AI credits/tháng

### Hạn mức mới
| Gói | Cũ | Mới |
|-----|-----|-----|
| Free | 30 | **20** |
| Plus | 100 | **60** |
| Pro | 250 | **150** |
| Business | 500 | **300** |
| Enterprise | NULL | NULL (giữ nguyên) |

### Chi tiết kỹ thuật

**1. Migration: UPDATE `plan_limits`**
```sql
UPDATE plan_limits SET max_ai_messages_per_month = 20 WHERE plan = 'plan_free';
UPDATE plan_limits SET max_ai_messages_per_month = 60 WHERE plan = 'plan_plus';
UPDATE plan_limits SET max_ai_messages_per_month = 150 WHERE plan = 'plan_pro';
UPDATE plan_limits SET max_ai_messages_per_month = 300 WHERE plan = 'plan_business';
```

**2. Edge function `team-assistant/index.ts`**
- Đổi fallback default từ `30` → `20`

**3. Frontend fallback**
- `AIAssistant.tsx`: fallback `30` → `20`
- `AIAssistantPanel.tsx`: fallback `30` → `20`

**4. i18n `en.ts` — tất cả các chỗ hiển thị số**
- `30/month` → `20/month`, `100/month` → `60/month`, `250/month` → `150/month`, `500/month` → `300/month`
- `30 messages/month` → `20 messages/month`, tương tự cho các gói khác
- Áp dụng cho: `quotas`, `planComparison`, `servicePlanFeatures`, `servicePlanFullFeatures`, `servicePlanFeatureGroups`

**5. i18n `vi.ts` — tương tự**
- `30 lượt/tháng` → `20 lượt/tháng`, `100/tháng` → `60/tháng`, `250/tháng` → `150/tháng`, `500/tháng` → `300/tháng`

### Tổng: 1 migration + 1 edge function + 4 files sửa

