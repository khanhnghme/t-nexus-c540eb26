

## Fix: Sidebar hiển thị project đã xóa + trùng lặp

### Nguyên nhân

1. **Project đã xóa vẫn hiển thị**: `useWorkspaceProjects` chỉ fetch 1 lần khi mount hoặc khi `activeWorkspace` thay đổi. Không có cơ chế refresh khi project bị xóa → sidebar giữ dữ liệu cũ.

2. **Trùng lặp project**: Nếu user vừa là member vừa là creator của project có visibility `workspace_public`, project có thể xuất hiện trong cả `joinedProjects` lẫn logic khác. Cần đảm bảo deduplicate.

### Giải pháp

**File: `src/hooks/useWorkspaceProjects.ts`**

1. Thêm Realtime subscription lắng nghe thay đổi trên bảng `groups` (INSERT, UPDATE, DELETE) filtered theo `workspace_id` → tự động re-fetch khi có thay đổi
2. Thêm `refreshProjects()` function để gọi thủ công từ bên ngoài
3. Thêm deduplicate bằng `Map` theo `id` trước khi set state
4. Cleanup subscription khi unmount

```ts
// Realtime subscription
const channel = supabase
  .channel('workspace-projects')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'groups',
    filter: `workspace_id=eq.${activeWorkspace.id}`
  }, () => fetchProjects())
  .subscribe();

// Deduplicate
const allProjects = [...joinedProjects, ...publicProjects];
const uniqueMap = new Map(allProjects.map(p => [p.id, p]));
setProjects(Array.from(uniqueMap.values()));
```

**File: `src/components/SidebarTreeNav.tsx`**

- Cập nhật import để lấy `refreshProjects` (nếu cần gọi thủ công)

### Database

Cần enable realtime cho bảng `groups`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useWorkspaceProjects.ts` | Thêm realtime subscription + deduplicate + refreshProjects |
| Migration | Enable realtime cho bảng groups |

