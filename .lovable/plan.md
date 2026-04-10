

## Fix: Calendar Workspace Filter

### Root Cause

The task assignment filter on line 73-75 uses a **global** list of assignments:

```ts
if (assignedTaskIds.length > 0 && !isAssigned) return;
```

This means: "If the user has ANY task assignment anywhere, only show assigned tasks." When filtering by workspace B but the user's assignments are all in workspace A, every task in workspace B gets filtered out — resulting in an empty calendar.

The fix: apply the assignment filter only within the scope of the filtered tasks, not globally.

### Changes

**File: `src/pages/Calendar.tsx`** (lines 73-75)

Replace the current assignment filter logic:

```ts
// Before (broken):
filteredTasks.forEach((task: any) => {
  const isAssigned = assignedTaskIds.includes(task.id);
  if (assignedTaskIds.length > 0 && !isAssigned) return;
  ...
});

// After (fixed):
// Check if user has assignments among the FILTERED tasks only
const filteredTaskIds = filteredTasks.map((t: any) => t.id);
const relevantAssignments = assignedTaskIds.filter(id => filteredTaskIds.includes(id));

filteredTasks.forEach((task: any) => {
  const isAssigned = relevantAssignments.includes(task.id);
  if (relevantAssignments.length > 0 && !isAssigned) return;
  ...
});
```

This ensures that if a user has no assignments in the selected workspace, all tasks in that workspace are shown (as expected), rather than being hidden due to assignments in other workspaces.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Calendar.tsx` | Fix assignment filter scope to respect workspace context |

