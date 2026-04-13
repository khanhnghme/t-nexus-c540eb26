

## Fix: Project Guest không thấy workspace và project sau khi accept invite

### Nguyên nhân gốc

Khi user được mời vào project với vai trò `project_guest`, họ được thêm vào `group_members` (với `is_guest=true`) nhưng **KHÔNG** được thêm vào `workspace_members` (đúng theo kiến trúc guest isolation).

Tuy nhiên có 2 chỗ chặn:

1. **RLS trên bảng `workspaces`**: Policy `workspace_select_participant` chỉ cho phép SELECT nếu user là `owner_id` HOẶC có record trong `workspace_members`. Guest không thỏa cả hai → không đọc được workspace row.

2. **`WorkspaceContext.tsx`**: Chỉ query 2 nguồn (owned workspaces + workspace_members). Không bao giờ tìm workspace thông qua `group_members`.

### Giải pháp

**File 1: Database migration** — Thêm RLS policy mới trên bảng `workspaces`

```sql
CREATE POLICY "workspace_select_project_guest"
ON public.workspaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = auth.uid()
      AND g.workspace_id = workspaces.id
  )
);
```

Policy này cho phép user đọc workspace row nếu họ là member của bất kỳ project nào trong workspace đó (kể cả guest).

**File 2: `src/contexts/WorkspaceContext.tsx`** — Thêm bước 3 discover guest workspaces

Sau khi fetch owned + member workspaces, thêm query:

```typescript
// 3. Discover workspaces through project memberships (for guests)
const { data: guestGroups } = await (supabase as any)
  .from('group_members')
  .select('groups!inner(workspace_id)')
  .eq('user_id', user.id)
  .eq('is_guest', true);

const existingWsIds = new Set(allWorkspaces.map(w => w.id));
const guestWsIds = [...new Set(
  (guestGroups || [])
    .map((g: any) => g.groups?.workspace_id)
    .filter((id: string) => id && !existingWsIds.has(id))
)];

if (guestWsIds.length > 0) {
  const { data: guestWsData } = await (supabase as any)
    .from('workspaces')
    .select('*')
    .in('id', guestWsIds);
  
  allWorkspaces.push(
    ...(guestWsData || []).map((w: any) => ({ ...w, my_role: null }))
  );
}
```

`my_role = null` đánh dấu user không có quyền workspace-level — chỉ là guest ở project level.

### Tổng kết

| Thay đổi | File |
|----------|------|
| Thêm RLS policy cho workspace SELECT | Migration SQL |
| Thêm query discover guest workspaces | `src/contexts/WorkspaceContext.tsx` |

Không cần thay đổi gì ở `useWorkspaceProjects.ts` — hook đó đã filter project theo `group_members` + `workspace_id`, sẽ tự hiện project khi workspace được discover.

