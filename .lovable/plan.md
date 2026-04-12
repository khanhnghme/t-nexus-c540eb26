

## Fix: Custom project "not found" — Auth race condition

### Nguyên nhân gốc

`GroupDetail.tsx` line 181:
```typescript
useEffect(() => { if (routeId || pageSlug) fetchGroupData(); }, [routeId, pageSlug]);
```

`fetchGroupData` chạy ngay khi component mount mà KHÔNG đợi `user` sẵn sàng. Khi auth session chưa load xong, `auth.uid()` trong RLS là `null` → query `groups` trả empty → hiện toast "Project not found" → redirect về `/groups`.

Lỗi này ảnh hưởng tất cả project private (cả basic lẫn custom), nhưng custom project dễ bị hơn vì thường mới tạo xong → navigate thẳng vào.

### Giải pháp

**File: `src/pages/GroupDetail.tsx`**

1. Thêm `user` vào dependency array của `useEffect` tại line 181
2. Guard `fetchGroupData` — chỉ chạy khi `user` đã có giá trị
3. Khi `user` là null (auth đang load), giữ trạng thái loading thay vì query ngay

```typescript
// Before
useEffect(() => { if (routeId || pageSlug) fetchGroupData(); }, [routeId, pageSlug]);

// After  
useEffect(() => { 
  if ((routeId || pageSlug) && user) fetchGroupData(); 
}, [routeId, pageSlug, user]);
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/GroupDetail.tsx` | Thêm guard `user` trong useEffect + dependency array |

