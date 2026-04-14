

## Plan: Chuyển hạn mức AI từ ngày sang tháng

### Hạn mức mới
- Free: **30/tháng** | Plus: **100/tháng** | Pro: **250/tháng** | Business: **500/tháng** | Enterprise: Unlimited

### Chi tiết kỹ thuật

**1. Migration: Đổi cột + tạo RPC mới**
- Rename `max_ai_messages_per_day` → `max_ai_messages_per_month` trong `plan_limits`
- UPDATE giá trị: free=30, plus=100, pro=250, business=500, custom=NULL
- Tạo RPC `get_owner_ai_usage_month(_owner_id, _month_start date, _month_end date)` — tổng usage trong khoảng tháng
- Tạo RPC `get_workspace_ai_usage_month(_workspace_id, _month_start, _month_end)` — per workspace

**2. Edge function `team-assistant/index.ts`**
- Đổi select `max_ai_messages_per_day` → `max_ai_messages_per_month`
- Gọi `get_owner_ai_usage_month` thay vì `get_owner_ai_usage_today`
- Tính `_month_start` = ngày 1 tháng hiện tại, `_month_end` = hôm nay
- Cập nhật message lỗi 429: "hết lượt tháng này"

**3. Frontend `AIAssistant.tsx` + `AIAssistantPanel.tsx`**
- Đổi gọi RPC sang `get_owner_ai_usage_month`
- Đổi select `max_ai_messages_per_month`
- Label: "còn lại / tối đa / tháng"
- Toast lỗi: "hết lượt tháng này"

**4. `ServicePlan.tsx`**
- Summary card: gọi monthly RPC thay vì daily
- Per-workspace: gọi `get_workspace_ai_usage_month`
- Đổi label hiển thị

**5. `workspaceQuota.ts`**
- Đổi mapping `'workspace:limit_ai_messages': 'max_ai_messages_per_month'`

**6. i18n `en.ts` + `vi.ts` (tất cả ~30+ chỗ)**
- `/day` → `/month`, `lượt/ngày` → `lượt/tháng`
- `messages/day` → `messages/month`
- Giá trị: 5→30, 20→100, 50→250, 150→500
- `hôm nay` → `tháng này`, `ngày mai` → `tháng sau`

### Tổng: 1 migration + 1 edge function + 5 files sửa

