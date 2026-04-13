

## Bước 7: Cập nhật Pages — System/Workspace role strings

### Mục tiêu
Thay tất cả role string cũ (underscore) sang format `resource:role` mới trong 4 page files. Không thay đổi logic, chỉ thay chuỗi so sánh.

### Phạm vi thay đổi — 4 files

#### 1. `src/pages/Dashboard.tsx` (2 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 430 | `wsRole === 'workspace_owner' \|\| wsRole === 'workspace_admin'` | `wsRole === 'workspace:owner' \|\| wsRole === 'workspace:admin'` |
| 906 | `inv.role_granted === 'workspace_admin'` | `inv.role_granted === 'workspace:admin'` |

#### 2. `src/pages/Groups.tsx` (2 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 87 | `workspaceRole === 'workspace_owner' \|\| workspaceRole === 'workspace_admin'` | `workspaceRole === 'workspace:owner' \|\| workspaceRole === 'workspace:admin'` |
| 960 | `group.myRole === 'workspace_admin'` | `group.myRole === 'workspace:admin'` |

#### 3. `src/pages/WorkspaceSettings.tsx` (2 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 77 | `workspaceRole === 'workspace_owner'` | `workspaceRole === 'workspace:owner'` |
| 78 | `workspaceRole === 'workspace_admin'` | `workspaceRole === 'workspace:admin'` |

#### 4. `src/pages/MemberManagement.tsx` (8 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 135 | `roles.includes('system_owner') \|\| roles.includes('system_admin')` | `roles.includes('system:owner') \|\| roles.includes('system:admin')` |
| 173 | `!roles.includes('system_owner') && !roles.includes('system_admin')` | `!roles.includes('system:owner') && !roles.includes('system:admin')` |
| 174 | `roles.includes('system_admin') && !roles.includes('system_owner')` | `roles.includes('system:admin') && !roles.includes('system:owner')` |
| 175 | `roles.includes('system_owner')` | `roles.includes('system:owner')` |
| 293 | `role: 'system_admin'` | `role: 'system:admin'` |
| 571 | `roles.includes('system_owner')` | `roles.includes('system:owner')` |
| 574 | `!roles.includes('system_owner') && roles.includes('system_admin')` | `!roles.includes('system:owner') && roles.includes('system:admin')` |
| 854 | `includes('system_owner')` / `includes('system_admin')` | `includes('system:owner')` / `includes('system:admin')` |

### Không thay đổi
- Không sửa hooks, contexts, components, edge functions, hay database
- `WorkspaceMembers.tsx` đã được cập nhật ở Bước 6
- Admin pages không chứa role strings cũ (đã kiểm tra)

