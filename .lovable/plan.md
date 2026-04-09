## Plan: Đợt 4 — Module 5 (Phân quyền Admin Billing)

### Scope
Thêm phân quyền chi tiết cho billing admin: `billing_viewer`, `billing_operator`, `billing_manager`. Gate tất cả actions trong ManagePlanDialog + ẩn/hiện UI theo quyền. `system_owner` bypass tất cả.

### 1. Migration SQL

**Thêm cột `billing_role` vào `user_roles`**:
```sql
ALTER TABLE user_roles ADD COLUMN billing_role text;
-- Values: null (no billing access), 'billing_viewer', 'billing_operator', 'billing_manager'
```

**Tạo function `get_billing_role`**:
```sql
CREATE FUNCTION get_billing_role(_user_id uuid) RETURNS text
-- Returns: 'billing_manager' for system_owner (auto), 
-- or billing_role from user_roles for system_admin
-- null if no billing access
```

### Phân quyền chi tiết

| Quyền | Viewer | Operator | Manager | Owner |
|-------|--------|----------|---------|-------|
| Xem gói, payments, history | ✓ | ✓ | ✓ | ✓ |
| Xem notes | ✓ | ✓ | ✓ | ✓ |
| Thêm notes | ✗ | ✓ | ✓ | ✓ |
| Gia hạn (extend) | ✗ | ✓ | ✓ | ✓ |
| Nâng/hạ gói | ✗ | ✓ | ✓ | ✓ |
| Grant Trial | ✗ | ✓ | ✓ | ✓ |
| Suspend / Restore | ✗ | ✗ | ✓ | ✓ |
| Force downgrade to Free | ✗ | ✗ | ✓ | ✓ |
| Custom plan assign | ✗ | ✗ | ✓ | ✓ |

### 2. Hook `useAdminBillingRole.ts`
- Fetch current user's `system_role` + `billing_role` từ `user_roles`
- Export:
  - `billingRole`: 'viewer' | 'operator' | 'manager' | null
  - `canView`: boolean
  - `canOperate`: boolean (extend, upgrade, downgrade, grant trial, add notes)
  - `canManage`: boolean (suspend, restore, force actions)
  - `isLoading`: boolean

### 3. Cập nhật `ManagePlanDialog.tsx`
- Import `useAdminBillingRole`
- Disable/ẩn action options theo quyền:
  - Viewer: dialog không mở (nút bị ẩn)
  - Operator: ẩn `suspend`, `restore` khỏi select
  - Manager/Owner: full access
- Hiển thị badge quyền hiện tại của admin

### 4. Cập nhật `AdminUserBilling.tsx`
- Import `useAdminBillingRole`
- Quick action buttons: ẩn/disable theo quyền
  - Viewer: ẩn tất cả quick actions
  - Operator: ẩn suspend/restore
  - Manager: hiện tất cả
- Tab Notes: ẩn form thêm note nếu viewer

### 5. Cập nhật `UserNotesTab.tsx`
- Nhận prop `canAddNote: boolean`
- Ẩn form thêm note nếu `canAddNote === false`

### 6. Cập nhật `useAdminPlanActions.ts`
- Thêm server-side validation: check billing_role trước khi execute
- Reject nếu operator cố suspend/restore

### 7. i18n
- `en.ts` + `vi.ts`: thêm block `adminBilling.rbac` (~10 chuỗi: role labels, permission denied messages, role badge labels)

### Files

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm `billing_role` vào `user_roles` + function `get_billing_role` |
| `src/hooks/useAdminBillingRole.ts` | Hook mới: kiểm tra quyền billing |
| `src/components/admin/ManagePlanDialog.tsx` | Gate actions theo role |
| `src/pages/AdminUserBilling.tsx` | Ẩn/hiện quick actions theo role |
| `src/components/admin/UserNotesTab.tsx` | Prop `canAddNote` |
| `src/hooks/useAdminPlanActions.ts` | Validation quyền server-side |
| `src/lib/i18n/en.ts` | Thêm chuỗi rbac |
| `src/lib/i18n/vi.ts` | Thêm chuỗi rbac |
