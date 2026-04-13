

## Fix: Website freezes when deleting a member

### Root Cause

The `AlertDialogAction` component in the delete confirmation dialog has a built-in behavior that automatically closes the dialog on click. However, `handleDeleteMember` ALSO closes the dialog by calling `setMemberToDelete(null)`. This creates a race condition:

1. `handleDeleteMember` sets `memberToDelete = null` → React schedules state update → dialog should close
2. `AlertDialogAction` fires its internal close → calls `onOpenChange` → sets `memberToDelete = null` again
3. Radix's controlled vs internal state conflict causes rendering issues during the close animation

Additionally, the `members` array in `useEffect` dependencies (lines 191, 243) causes unnecessary re-fetches on every re-render since `members` is a new reference each time, compounding the issue during the post-delete refresh cascade.

### Fix

**File: `src/components/MemberManagementCard.tsx`**

1. **Replace `AlertDialogAction` with `Button` for delete confirmation** — same pattern already used in the Leave Project dialog (line 1969). This eliminates the double-close race condition. Apply to both single-delete and bulk-delete dialogs.

2. **Stabilize `useEffect` dependencies** — Replace `members` with `members.length` or a `membersKey` (stringified user IDs) in the useEffect dependencies for fetching pending invitations and join requests, to avoid unnecessary refetches.

3. **Add `e.preventDefault()` pattern for remaining `AlertDialogAction` buttons** in bulk role change dialog as safety measure.

### Changes summary

| What | Where |
|------|-------|
| Replace `AlertDialogAction` with `Button` in delete dialogs | Lines ~1668, ~1690 |
| Stabilize useEffect deps (`members` → `members.length`) | Lines 191, 243 |

