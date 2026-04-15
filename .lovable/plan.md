

# Thêm chức năng chia sẻ Credit AI theo Workspace

## Phân tích hiện trạng

Hiện tại, credit AI **luôn** được tính chung (shared pool) theo Owner — hàm `get_owner_ai_credit_usage_month` cộng tổng `token_count` của tất cả members trong workspace của owner. Không có cơ chế tắt/bật chia sẻ.

## Thay đổi cần làm

### 1. DB Migration — Thêm cột `share_ai_credits` vào bảng `workspaces`

```sql
ALTER TABLE public.workspaces 
  ADD COLUMN share_ai_credits boolean NOT NULL DEFAULT false;
```

### 2. Edge Function `workspace-management` — Cho phép update `share_ai_credits`

Trong action `update_workspace`, thêm:
```typescript
if (body.share_ai_credits !== undefined) updates.share_ai_credits = body.share_ai_credits;
```

Thêm `share_ai_credits?: boolean` vào `RequestBody`.

### 3. Edge Function `team-assistant` — Logic kiểm tra credit theo mode

Sau khi lấy được `effectiveOwnerId` và workspace, thêm logic:

- Query `workspaces.share_ai_credits` cho workspace hiện tại
- **Khi OFF (default):** Chỉ tính credit của user hiện tại (query `ai_daily_usage` WHERE `user_id = userId`)
- **Khi ON:** Giữ logic hiện tại (pool toàn bộ members qua `get_owner_ai_credit_usage_month`)

Cần tạo RPC mới `get_user_ai_credit_usage_month` cho mode individual:
```sql
CREATE OR REPLACE FUNCTION public.get_user_ai_credit_usage_month(
  _user_id uuid, _month_start date, _month_end date
) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    CEIL(SUM(token_count)::numeric / 1000)::integer, 0
  )
  FROM public.ai_daily_usage
  WHERE user_id = _user_id
    AND usage_date >= _month_start
    AND usage_date <= _month_end;
$$;
```

### 4. UI — WorkspaceSettings.tsx

Trong Info tab, thêm section "AI Credit Sharing" (chỉ hiển thị khi owner/admin và plan Pro+):

- **Switch** toggle ON/OFF
- **Warning text** khi bật: "Tất cả thành viên sẽ dùng chung credit AI của workspace"
- Gọi `workspace-management` với `action: 'update_workspace'` + `share_ai_credits`
- Chỉ owner có quyền thay đổi setting này

### 5. Frontend AI pages — Cập nhật logic hiển thị usage

Cập nhật 3 nơi (`AIAssistant.tsx`, `AIAssistantPanel.tsx`, `ServicePlan.tsx`):

- Fetch `share_ai_credits` từ workspace hiện tại
- **Khi OFF:** Gọi `get_user_ai_credit_usage_month` (credit cá nhân)
- **Khi ON:** Giữ logic hiện tại `get_owner_ai_credit_usage_month` (pool chung)
- Hiển thị label phụ: "Personal credit" vs "Shared pool"

### 6. i18n — Thêm labels EN/VI

```
shareAiCredits: 'Share AI Credit within Workspace'
shareAiCreditsDesc: 'When enabled, all members share the same credit pool'
shareAiCreditsWarning: 'All members will share the workspace AI credit pool'
personalCredit: 'Personal credit'
sharedPool: 'Shared pool'
```

## Không thay đổi
- Billing logic / plan_limits
- Token recording (vẫn ghi theo user_id)
- DB table `ai_daily_usage` structure

## Thứ tự triển khai
1. DB migration (add column + new RPC)
2. Edge Function `workspace-management` (accept new field)
3. Edge Function `team-assistant` (branching logic)
4. i18n labels
5. WorkspaceSettings UI (toggle)
6. AIAssistant + AIAssistantPanel + ServicePlan (display logic)

