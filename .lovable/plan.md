

## Bước 8: Cập nhật components — Member management

### Mục tiêu
Thay tất cả role string cũ (underscore) sang format `resource:role` mới trong 6 component files liên quan đến quản lý thành viên.

### Phạm vi thay đổi — 6 files

#### 1. `src/components/MemberManagementCard.tsx` (~20 vị trí)

Thay đổi chính:
- State types: `'project_member' | 'project_admin'` → `'project_basic:member' | 'project_basic:admin'`
- Initial values: `'project_member'` → `'project_basic:member'`
- DB insert role: `'project_member'` → `'project_basic:member'`
- Comparisons: `=== 'project_admin'` → `=== 'project_basic:admin'`, `=== 'project_owner'` → `=== 'project_basic:owner'`
- Role badge switch-case: `project_owner`, `project_admin` → `project_basic:owner`, `project_basic:admin`
- SelectItem values trong dialog đổi role

#### 2. `src/components/MemberDetailDialog.tsx` (~8 vị trí)

- `systemRoleLabel` keys: `system_owner` → `system:owner`, `system_admin` → `system:admin`, `project_admin` → `project_basic:admin`, `project_member` → `project_basic:member`
- `getGroupRoleLabel` switch-case: `project_owner` → `project_basic:owner`, `project_admin` → `project_basic:admin`, `project_member` → `project_basic:member`, `project_guest` → xóa (đã migrate thành member)
- Badge comparison: `g.role === 'project_admin'` → `g.role === 'project_basic:admin'`

#### 3. `src/components/MemberRoleManagementDialog.tsx` (~10 vị trí)

- Promote action: `new_role: 'project_admin'` → `new_role: 'project_basic:admin'`
- Demote action: `new_role: 'project_member'` → `new_role: 'project_basic:member'`
- Activity log metadata: `from_role`/`to_role` strings
- Role comparison: `g.role === 'project_admin'` → `g.role === 'project_basic:admin'`

#### 4. `src/components/ProjectTransferDialog.tsx` (~5 vị trí)

- `role: 'project_owner'` → `role: 'project_basic:owner'`
- `.update({ role: 'project_admin' })` → `.update({ role: 'project_basic:admin' })`
- `.update({ role: 'project_member' })` → `.update({ role: 'project_basic:member' })`
- Display comparison: `m.role === 'project_owner'` / `'project_admin'` → format mới

#### 5. `src/components/ProfileViewDialog.tsx` (~4 vị trí)

- Default param: `role = 'project_member'` → `role = 'project_basic:member'`
- Switch-case: `project_owner` → `project_basic:owner`, `project_admin` → `project_basic:admin`

#### 6. `src/components/MemberAuthForm.tsx` (1 vị trí)

- Dòng 368: `r.role === 'system_owner'` → `r.role === 'system:owner'`

### Không thay đổi
- Không sửa hooks, contexts, pages, edge functions, hay database
- Không thay đổi logic, chỉ thay chuỗi so sánh và type literals

