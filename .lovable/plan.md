

## Bước 13: Cleanup — Xóa deprecated aliases, sửa role strings còn sót ✅

### Hoàn thành
1. Xóa deprecated aliases `isOwnerSystem`, `isLeader` từ `AuthContext` — thay bằng `isSystemAdmin` alias
2. Cleanup legacy types (`SystemRoleLegacy`, `WorkspaceRoleLegacy`, `ProjectRoleLegacy`) từ `database.ts`
3. Cập nhật tất cả underscore role strings sang `resource:role` format trong 15+ files
4. Fix build errors: `RememberLoginScreen`, `MessageItem`, `TaskEditDialog`, `AdminActivity`, `AdminUsers`, `Dashboard`, `PersonalInfo`

### Files đã sửa
- `src/contexts/AuthContext.tsx`
- `src/types/database.ts`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/SidebarTreeNav.tsx`
- `src/components/RememberLoginScreen.tsx`
- `src/components/TaskEditDialog.tsx`
- `src/components/AdminBackupRestore.tsx`
- `src/components/JoinByCodeDialog.tsx`
- `src/components/TaskSubmissionDialog.tsx`
- `src/components/ProjectGuestInviteDialog.tsx`
- `src/components/communication/MessageItem.tsx`
- `src/components/calendar/CalendarTaskDetailDialog.tsx`
- `src/pages/Groups.tsx`
- `src/pages/CreateCustomProject.tsx`
- `src/pages/AdminUsers.tsx`
- `src/pages/AdminActivity.tsx`
- `src/pages/TaskDetail.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/PersonalInfo.tsx`
- `src/lib/projectEvidencePdf.ts`

### Còn lại (UI filter keys, không phải role comparison)
- `ActivityLogFilters.tsx`, `ProjectActivityLog.tsx`, `PublicActivityLog.tsx` — activity log action types
- `MemberManagement.tsx` — UI filter keys
- `Tips.tsx` — tip IDs
