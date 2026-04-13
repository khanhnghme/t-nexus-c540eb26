

## Fix: Project Guest cannot see workspace or project after accepting invite

### Root Cause

When a user accepts a **project-scoped invite** (via `workspace_invites` with `scope=project`), the edge function adds them to `group_members` with `is_guest=true` but does NOT add them to `workspace_members`. This is correct per the architecture (guests are project-level only).

However, `WorkspaceContext.fetchWorkspaces()` only discovers workspaces through two sources:
1. `workspaces.owner_id = user.id`
2. `workspace_members.user_id = user.id`

Since the guest is in neither, the workspace never appears in their list, meaning they can't switch to it, and therefore can't see or access the project.

### Solution

Add a third data source in `WorkspaceContext`: discover workspaces where the user has `group_members` entries for projects belonging to that workspace. These are "guest workspaces" with `my_role = null` (no workspace-level role).

### Files to change

| File | Action |
|------|--------|
| `src/contexts/WorkspaceContext.tsx` | Add query: `group_members` → `groups.workspace_id` → `workspaces` to discover guest workspaces |

### Implementation detail

In `fetchWorkspaces()`, after fetching owned + member workspaces, add:

```typescript
// 3. Discover workspaces through project guest memberships
const { data: guestGroups } = await (supabase as any)
  .from('group_members')
  .select('groups!inner(workspace_id)')
  .eq('user_id', user.id)
  .eq('is_guest', true);

const guestWsIds = [...new Set(
  (guestGroups || [])
    .map((g: any) => g.groups?.workspace_id)
    .filter(Boolean)
)].filter(id => !allWorkspaces.some(w => w.id === id));

if (guestWsIds.length > 0) {
  const { data: guestWsData } = await (supabase as any)
    .from('workspaces')
    .select('*')
    .in('id', guestWsIds);

  const guestWorkspaces = (guestWsData || []).map((w: any) => ({
    ...w,
    my_role: null, // no workspace role — guest only
  }));
  allWorkspaces.push(...guestWorkspaces);
}
```

This ensures the workspace appears in the user's list so they can switch to it and see their invited project. The `my_role = null` correctly marks them as having no workspace-level permissions (view-only, project-scoped access only).

### RLS consideration

The `groups` table RLS likely already allows members to read their own group rows. The `workspaces` table may need a SELECT policy allowing users who are members of projects within that workspace. I will check existing RLS and add a policy if needed.

