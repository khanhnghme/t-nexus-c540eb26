

## Fix: Trang `/pr/...` và `/pa/...` bị 404 hoặc trắng

### Nguyên nhân

Trong `GroupDetail.tsx`, biến `routeId` được tính bằng:
```ts
const routeId = projectSlug || projectId || groupId;
```

- Với route `/pr/:wsParam/:projectSlug` → `projectSlug` có giá trị → OK
- Với route `/pa/:wsParam/:pageSlug` → `projectSlug`, `projectId`, `groupId` đều `undefined` → `routeId = undefined` → `fetchGroupData` không chạy → trang trắng

### Giải pháp

Trong `GroupDetail.tsx`, khi `routeId` undefined nhưng `pageSlug` có giá trị (route `/pa/...`), cần truy vấn bảng `project_pages` theo `slug` để tìm `group_id`, rồi dùng `group_id` đó để load group data.

### Thay đổi

**File: `src/pages/GroupDetail.tsx`**

1. Cập nhật `fetchGroupData` để xử lý trường hợp `pageSlug` có nhưng `routeId` không có:

```ts
// Nếu vào từ /pa/:wsParam/:pageSlug, resolve group_id từ page slug
if (!routeId && pageSlug) {
  const { data: pageData } = await supabase
    .from('project_pages')
    .select('group_id')
    .eq('slug', pageSlug)
    .single();
  if (!pageData) {
    toast({ title: tc.error, description: gd.notFound, variant: 'destructive' });
    navigate('/groups');
    return;
  }
  // Load group by UUID from page's group_id
  const { data } = await supabase.from('groups').select('*').eq('id', pageData.group_id).single();
  groupData = data;
}
```

2. Cập nhật `useEffect` trigger:
```ts
useEffect(() => { if (routeId || pageSlug) fetchGroupData(); }, [routeId, pageSlug]);
```

3. Cập nhật `routeId` fallback logic để bao gồm page case.

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/GroupDetail.tsx` | Thêm logic resolve page slug → group_id khi vào route `/pa/...` |

