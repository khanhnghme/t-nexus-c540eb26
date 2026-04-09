

## Đợt 4 — Module 5: Phân quyền Admin Billing (RBAC)

### 1. Migration SQL
Thêm cột `billing_role` vào `user_roles` + tạo function `get_billing_role`:

```sql
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS billing_role text;

CREATE OR REPLACE FUNCTION public.get_billing_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'system_owner')
      THEN 'billing_manager'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('system_owner','system_admin'))
      THEN (SELECT COALESCE(ur.billing_role, 'billing_viewer') FROM public.user_roles ur WHERE ur.user_id = _user_id LIMIT 1)
    ELSE NULL
  END
$$;
```

### 2. `src/hooks/useAdminBillingRole.ts` — Hook mới
- Query `user_roles` for current user
- `system_owner` → auto `billing_manager`
- `system_admin` → use `billing_role` column (default `billing_viewer`)
- Export: `billingRole`, `canView`, `canOperate`, `canManage`

### 3. `src/components/admin/ManagePlanDialog.tsx` — Gate actions
- Import `useAdminBillingRole`
- Viewer: dialog should not open (handled by parent)
- Operator: filter out `suspend`/`restore` from action select
- Manager: full access

### 4. `src/pages/AdminUserBilling.tsx` — Gate quick actions
- Import `useAdminBillingRole`
- Viewer: hide all quick action buttons
- Operator: hide suspend/restore buttons
- Manager: show all

### 5. `src/components/admin/UserNotesTab.tsx` — Prop `canAddNote`
- Add prop, hide form when false

### 6. `src/hooks/useAdminPlanActions.ts` — Validate role
- Check billing role before executing dangerous actions
- Reject operator attempting suspend/restore

### 7. i18n (`en.ts` + `vi.ts`)
Add `adminBilling.rbac` block:
```
rbac: {
  billingViewer: 'Billing Viewer' / 'Xem thanh toán',
  billingOperator: 'Billing Operator' / 'Vận hành thanh toán',
  billingManager: 'Billing Manager' / 'Quản lý thanh toán',
  permissionDenied: 'You do not have permission...' / 'Bạn không có quyền...',
  roleLabel: 'Your billing role' / 'Quyền thanh toán',
}
```

### Files

| File | Thay đổi |
|------|----------|
| Migration SQL | `billing_role` column + `get_billing_role` function |
| `src/hooks/useAdminBillingRole.ts` | Hook mới |
| `src/components/admin/ManagePlanDialog.tsx` | Filter actions by role |
| `src/pages/AdminUserBilling.tsx` | Gate quick actions by role |
| `src/components/admin/UserNotesTab.tsx` | Add `canAddNote` prop |
| `src/hooks/useAdminPlanActions.ts` | Server-side role validation |
| `src/lib/i18n/en.ts` | Add rbac strings |
| `src/lib/i18n/vi.ts` | Add rbac strings |

