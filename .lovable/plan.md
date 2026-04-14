

## Plan: Fix AI usage tính theo active workspace + thêm AI vào workspace detail

### Vấn đề

1. **AIAssistant.tsx** gọi `get_user_workspace_owner` — hàm này trả về owner của workspace **đầu tiên** chứ không phải workspace **đang active**. Nếu user đang ở workspace của người khác nhưng bản thân cũng sở hữu workspace → hàm trả về chính họ thay vì owner workspace đang active.

2. **ServicePlan.tsx** phần "Chi tiết theo Workspace" chưa có dòng AI usage cho từng workspace.

### Giải pháp

**1. Migration: Tạo RPC `get_workspace_ai_usage_today`**
- Đếm tổng `ai_daily_usage.message_count` của tất cả thành viên thuộc 1 workspace cụ thể trong ngày
- Dùng cho cả 2 mục đích: hiển thị per-workspace ở ServicePlan + lấy usage đúng workspace đang active ở AIAssistant

```sql
CREATE OR REPLACE FUNCTION public.get_workspace_ai_usage_today(_workspace_id uuid, _date date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(SUM(adu.message_count), 0)::integer
  FROM ai_daily_usage adu
  WHERE adu.usage_date = _date
    AND adu.user_id IN (
      SELECT wm.user_id FROM workspace_members wm WHERE wm.workspace_id = _workspace_id
    )
$$;
```

**2. Fix `src/pages/AIAssistant.tsx`**
- Import `useWorkspace` → lấy `activeWorkspace`
- Thay logic cũ (`get_user_workspace_owner` → fallback user.id`) bằng:
  - Dùng `activeWorkspace.owner_id` trực tiếp làm owner
  - Gọi `get_owner_ai_usage_today` với owner_id của active workspace
  - Lấy plan limit từ profile của owner đó
- Thêm `activeWorkspace?.id` vào dependency của useEffect

**3. Fix `src/components/ai/AIAssistantPanel.tsx`** (nếu còn dùng)
- Áp dụng logic tương tự như AIAssistant.tsx

**4. Cập nhật `src/pages/ServicePlan.tsx`**
- Trong `WorkspaceUsage` interface: thêm `aiUsage: number`
- Trong `fetchUsages`: gọi `get_workspace_ai_usage_today` cho từng workspace owned
- Trong workspace detail card: thêm dòng hiển thị AI usage (icon Bot, `X lượt`, tỷ lệ % contribution)

### Tổng: 1 migration + 3 files sửa

