

## Fix: Hiển thị thông báo rõ ràng khi đạt giới hạn workspace

### Vấn đề
Edge function trả HTTP 400 → `supabase.functions.invoke` throw error generic, client không đọc được body JSON chứa message tiếng Việt → user thấy lỗi "non 2x" không rõ ràng.

### Giải pháp

**1. Edge function (`supabase/functions/workspace-management/index.ts`)**
- Khi đạt giới hạn workspace, trả HTTP 200 với `{ error: "...", limit_reached: true }` thay vì HTTP 400
- Client sẽ đọc được `data.error` bình thường

Thay đổi tại line 104-106:
```typescript
if ((currentWsCount ?? 0) >= maxWs) {
  return json({ 
    error: `Bạn đã đạt giới hạn ${maxWs} workspace cho gói ${callerPlan.replace("plan_", "").toUpperCase()}`,
    limit_reached: true 
  });
}
```

**2. Client (`src/pages/CreateWorkspace.tsx`)**
- Khi `data.limit_reached === true`, hiển thị toast cảnh báo rõ ràng kèm gợi ý nâng cấp hoặc chuyển về workspace hiện có
- Thêm nút "Quay về Workspace" bên cạnh nút Cancel

Thay đổi tại line 44-45:
```typescript
if (error) throw error;
if (data?.limit_reached) {
  toast.error(data.error);
  return;
}
if (data?.error) throw new Error(data.error);
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/workspace-management/index.ts` | Trả 200 thay vì 400 khi limit reached |
| `src/pages/CreateWorkspace.tsx` | Xử lý `limit_reached` hiển thị toast rõ ràng |

