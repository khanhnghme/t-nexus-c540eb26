

## Bước 13: Cleanup — Xóa deprecated aliases, sửa role strings còn sót

### Mục tiêu
1. Xóa deprecated aliases trong `AuthContext` (`isOwnerSystem`, `isLeader` compat aliases)
2. Sửa tất cả legacy role strings còn sót trong client-side code
3. Cleanup legacy types trong `database.ts`
4. Cập nhật các component/page còn dùng underscore role strings

### Phạm vi thay đổi — 13 files

#### 1. `src/contexts/AuthContext.tsx` — Xóa deprecated aliases

- Xóa `isOwnerSystem` (alias của `isSystemOwner`) — thay bằng `isSystemOwner` ở nơi sử dụng
- Xóa `isLeader` (alias của `isSystemAdmin`) — thay bằng `isSystemAdmin` ở nơi sử dụng
- Giữ `isAdmin` vì được dùng rộng rãi (alias `isSystemAdmin`)

#### 2. `src/types/database.ts` — Cleanup legacy types

- `WorkspaceRole`: xóa legacy values `'workspace_owner' | 'workspace_admin' | 'workspace_member' | 'owner' | 'admin' | 'member'`
- Xóa hoàn toàn `SystemRoleLegacy`, `WorkspaceRoleLegacy`, `ProjectRoleLegacy` types

#### 3. `src/components/layout/DashboardLayout.tsx` (2 vị trí)

| Vị trí | Trước | Sau |
|--------|-------|-----|
| Dòng 250 | `workspaceRole !== 'workspace_owner'` | `workspaceRole !== 'workspace:owner'` |
| Dòng 325, 367 | Destructure `isLeader` từ `useAuth()` | Đổi sang `isSystemAdmin` hoặc xóa logic `isLeader` |

#### 4. `src/components/SidebarTreeNav.tsx` (6 vị trí)

| Trước | Sau |
|-------|-----|
| `'workspace_owner'` | `'workspace:owner'` |
| `'workspace_admin'` | `'workspace:admin'` |
| `'workspace_member'` | `'workspace:member'` |

#### 5. `src/pages/Groups.tsx` (5 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 197 | `'project_member'` (fallback myRole) | `'project_basic:member'` |
| 378 | `role: 'project_admin'` (insert) | `role: 'project_basic:admin'` |
| 388 | `role: 'project_member'` (invitation) | `role: 'project_basic:member'` |
| 430-434 | `getRoleBadge` switch: `'project_owner'`, `'project_admin'`, `'project_member'` | `'project_basic:owner'`, `'project_basic:admin'`, `'project_basic:member'` |
| 970 | `group.myRole === 'project_admin'` | `group.myRole === 'project_basic:admin'` |

#### 6. `src/pages/CreateCustomProject.tsx` (1 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 109 | `role: "project_admin" as any` | `role: "project_basic:admin"` |

#### 7. `src/pages/AdminUsers.tsx` (3 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 318 | `role: 'project_member'` (insert) | `role: 'project_basic:member'` |
| 476-479 | `m.role === 'project_owner'`/`'project_admin'` | `'project_basic:owner'`/`'project_basic:admin'` |
| 811 | `'project_member'` (default) | `'project_basic:member'` |

#### 8. `src/pages/TaskDetail.tsx` (1 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 59 | `'project_admin'` / `'project_owner'` | `'project_basic:admin'` / `'project_basic:owner'` |

#### 9. `src/pages/Dashboard.tsx` (1 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 826 | `inv.role === 'project_admin'` | `inv.role === 'project_basic:admin'` |

#### 10. `src/components/AdminBackupRestore.tsx` (2 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 1604 | `role: 'project_admin'` | `role: 'project_basic:admin'` |
| 1697 | `role: 'project_admin'` | `role: 'project_basic:admin'` |

#### 11. `src/components/communication/MessageItem.tsx` (1 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 186 | `'project_admin'` / `'project_owner'` | `'project_basic:admin'` / `'project_basic:owner'` |

#### 12. `src/components/JoinByCodeDialog.tsx` (1 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 188 | `role: 'project_member'` | `role: 'project_basic:member'` |

#### 13. `src/components/TaskSubmissionDialog.tsx` + `src/components/calendar/CalendarTaskDetailDialog.tsx` + `src/lib/projectEvidencePdf.ts` (4 vị trí)

- `TaskSubmissionDialog.tsx` dòng 451: `'project_admin'` → `'project_basic:admin'`
- `CalendarTaskDetailDialog.tsx` dòng 131: `'project_admin'`/`'project_owner'` → `'project_basic:admin'`/`'project_basic:owner'`
- `projectEvidencePdf.ts` dòng 201, 645: `'project_admin'` → `'project_basic:admin'`

### Không thay đổi
- `actionType: 'project_member'` trong `activityLogger.ts` và `MemberManagement.tsx` — đây là **activity log type**, không phải role string
- `roleFilter` cases trong `MemberManagement.tsx` — đây là **UI filter keys**, không phải role comparisons
- Edge functions (đã xong ở Bước 12)
- Database (đã xong ở Bước 3)

### Kết quả sau bước này
Sau khi hoàn thành, chạy `grep -rn` sẽ không còn bất kỳ legacy underscore role string nào được dùng làm **role comparison** trong toàn bộ codebase. Refactor phân quyền `resource:role` hoàn tất.

