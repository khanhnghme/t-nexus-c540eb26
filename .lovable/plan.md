

# Plan: Thiết kế logic hiển thị project 3 tab

## Tổng quan

Hiện tại `fetchGroups()` chỉ lấy project mà user đã join (qua `group_members`) + project public trong workspace. Tab "Shared" hiện filter sai (`created_by !== user.id`). Cần refactor cả logic fetch và RLS.

## Thay đổi

### 1. Migration — Thêm RLS policy cho workspace members

RLS hiện tại trên bảng `groups` chỉ cho phép SELECT nếu user là member, creator, admin, hoặc project public. Workspace members **không thể** xem project khác trong cùng workspace nếu chưa join.

```sql
CREATE POLICY "Workspace participants can view workspace projects"
ON public.groups FOR SELECT TO authenticated
USING (
  workspace_id IS NOT NULL
  AND public.is_workspace_participant(auth.uid(), workspace_id)
);
```

### 2. `src/pages/Groups.tsx` — Refactor `fetchGroups()`

**Tab `all` (Our Workspace):**
- Query trực tiếp `groups` table với `workspace_id = activeWorkspace.id` (RLS mới sẽ cho phép)
- Không cần qua `group_members` trước
- Vẫn lấy `group_members` riêng để xác định `myRole` cho mỗi project

**Tab `created`:**
- Giống `all` nhưng thêm filter `.eq('created_by', user.id)` trên query

**Tab `shared`:**
- Query `group_members` lấy tất cả `group_id` user là member
- Lấy các groups từ những `group_id` đó
- Filter client-side: `workspace_id !== activeWorkspace.id` (hoặc `workspace_id IS NULL`)

**Cụ thể:**

```typescript
// all / created: lấy TẤT CẢ project trong workspace
let q = supabase.from('groups').select('*')
  .eq('workspace_id', activeWorkspace.id)
  .order('created_at', { ascending: false });
if (activeFilter === 'created') q = q.eq('created_by', user.id);

// shared: lấy project user là member nhưng NGOÀI workspace hiện tại  
const { data: memberData } = await supabase
  .from('group_members').select('group_id').eq('user_id', user.id);
// Then fetch groups NOT in current workspace
```

### 3. `src/pages/Groups.tsx` — Cập nhật `filteredGroups`

- Xóa logic filter `activeFilter === 'created'` và `activeFilter === 'shared'` trong `useMemo` vì đã filter ở query level
- Chỉ giữ lại `searchQuery`, `modeFilter`, `visibilityFilter`

### 4. `src/components/SidebarTreeNav.tsx` — Đổi label

- "All projects" → "Our Workspace"
- "Created by me" giữ nguyên
- "Shared with me" giữ nguyên

### 5. `src/lib/i18n/en.ts` & `vi.ts` — Cập nhật labels

- `allProjects`: "Our Workspace" / "Workspace của tôi"
- Thêm mô tả phụ nếu cần

## Files thay đổi
1. `supabase/migrations/` — RLS policy mới
2. `src/pages/Groups.tsx` — Refactor fetch + filter logic
3. `src/components/SidebarTreeNav.tsx` — Label update
4. `src/lib/i18n/en.ts` — i18n
5. `src/lib/i18n/vi.ts` — i18n

## Không thay đổi
- DB schema (không thêm cột), Edge Functions, Dashboard, billing, auth

