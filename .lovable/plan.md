
# Cập nhật UI & Logic theo hệ thống Credit mới

## Tổng quan vấn đề

Có **3 nơi** vẫn dùng logic cũ (message count / `max_ai_messages_per_month`):

1. **`src/components/ai/AIAssistantPanel.tsx`** — Sheet panel AI dùng trong project context, vẫn đếm `questionsToday`, check `max_ai_messages_per_month`
2. **`src/pages/ServicePlan.tsx`** — Trang quản lý gói hiển thị "AI Messages" với RPC `get_owner_ai_usage_month` (message count) và `max_ai_messages_per_month`
3. **`src/lib/i18n/en.ts` & `vi.ts`** — Labels: "AI Messages", "lượt", "messages" cần đổi thành "AI Credits", "credit"

Trang **`AIAssistant.tsx`** đã đúng (dùng `get_owner_ai_credit_usage_month` + `max_ai_credits_per_month`).

## Thay đổi chi tiết

### 1. `src/components/ai/AIAssistantPanel.tsx`
- Đổi `questionsToday` → `creditsUsed`, `maxQuestions` → `maxCredits`
- Thay RPC `get_owner_ai_usage_month` → `get_owner_ai_credit_usage_month`
- Thay query `max_ai_messages_per_month` → `max_ai_credits_per_month`
- Cập nhật quota check: `creditsUsed >= maxCredits` thay vì message count
- Đổi toast: "Đã hết lượt hỏi" → "Đã hết credit AI"
- Free/Plus (`maxCredits === null`): bỏ giới hạn (Gemini miễn phí)
- Thêm `loadUsage` callback reusable + gọi lại sau mỗi message thành công (giống fix ở AIAssistant.tsx)

### 2. `src/pages/ServicePlan.tsx`
- Thay RPC `get_owner_ai_usage_month` → `get_owner_ai_credit_usage_month` (dòng ~163)
- Thay query `max_ai_messages_per_month` → `max_ai_credits_per_month` (dòng ~164)
- Cập nhật usage card label: `t.aiMessages` → `t.aiCredits`
- Đổi unit: `t.aiMessagesUnit` → `t.aiCreditsUnit` ("credit")
- Cập nhật workspace detail section (dòng ~737): hiển thị credit thay vì "lượt"
- Workspace-level AI RPC: `get_workspace_ai_usage_month` cũng cần đổi sang credit-based (hoặc dùng aggregate từ token_count)

### 3. `src/lib/i18n/en.ts` & `vi.ts`
- Thêm keys mới: `aiCredits`, `aiCreditsUnit`, `aiCreditsNote`
- EN: "AI Credits", "credit", "Shared across all workspace members"
- VI: "Credit AI", "credit", "Dùng chung cho tất cả thành viên workspace"
- Giữ keys cũ để backward compatible

### 4. DB: Thêm RPC `get_workspace_ai_credit_usage_month`
Hiện có `get_workspace_ai_usage_month` trả message count. Cần RPC mới trả credit (token/1000) cho mỗi workspace để ServicePlan workspace detail section hiển thị đúng.

```sql
CREATE OR REPLACE FUNCTION public.get_workspace_ai_credit_usage_month(
  _workspace_id uuid, _month_start date, _month_end date
) RETURNS integer ...
  SELECT COALESCE(CEIL(SUM(token_count)::numeric / 1000), 0)::integer
  FROM ai_daily_usage WHERE usage_date BETWEEN _month_start AND _month_end
  AND user_id IN (owner + members of workspace)
```

## Không thay đổi
- `AIAssistant.tsx` — đã cập nhật đúng credit system
- Edge Function `team-assistant` — đã ghi token đúng
- DB schema (`ai_daily_usage`, `plan_limits`) — đã có cột `token_count`, `max_ai_credits_per_month`
- `BillingWidget.tsx` — không hiển thị AI usage
- Pricing/Upgrade/Onboarding pages — i18n đã đúng credit labels

## Thứ tự triển khai
1. DB migration (RPC `get_workspace_ai_credit_usage_month`)
2. i18n labels (en.ts, vi.ts)
3. `AIAssistantPanel.tsx` → credit-based logic
4. `ServicePlan.tsx` → credit-based queries + labels
