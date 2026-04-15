

# Fix: Admin downgrade không apply khi immediate + non-free plan

## Nguyên nhân gốc

Trong `src/hooks/useAdminPlanActions.ts`, case `downgrade` (dòng 73-91):

- Nếu `newPlan === 'plan_free'` → Apply ngay ✅
- Nếu `newPlan !== 'plan_free'` → **Luôn chỉ schedule** (`next_plan`) bất kể `effectiveMode` là gì ❌

Khi admin chọn "Immediately" để downgrade từ Business → Plus, code chỉ set `next_plan = 'plan_plus'` mà không thay đổi `user_plan` / `plan`. Kết quả: user vẫn ở Business.

## Sửa đổi

### File: `src/hooks/useAdminPlanActions.ts`

Thay block `case 'downgrade'` (dòng 73-91) bằng logic phân biệt rõ `effectiveMode`:

```typescript
case 'downgrade':
  if (!newPlan) throw new Error('New plan required');
  if (effectiveMode === 'immediate') {
    // Apply ngay lập tức — bất kể plan nào
    profileUpdate.user_plan = newPlan;
    profileUpdate.plan = newPlan;
    profileUpdate.plan_status = 'active';
    profileUpdate.plan_source = 'admin_assigned';
    profileUpdate.next_plan = null;
    profileUpdate.next_billing_cycle = null;
    if (newPlan === 'plan_free') {
      profileUpdate.plan_expires_at = null;
      profileUpdate.downgraded_at = new Date().toISOString();
    } else {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      profileUpdate.plan_expires_at = expires.toISOString();
      logNewExpires = expires.toISOString();
    }
  } else {
    // Schedule cho next cycle
    profileUpdate.next_plan = newPlan;
    profileUpdate.next_billing_cycle = 'monthly';
  }
  break;
```

Thay đổi chính:
- `effectiveMode === 'immediate'` → set `user_plan`, `plan`, clear `next_plan`, tính `plan_expires_at` mới (30 ngày)
- `effectiveMode === 'next_cycle'` → chỉ schedule `next_plan` (giữ nguyên logic cũ)

## Không thay đổi
- UI (ManagePlanDialog) — giữ nguyên
- Log insert, admin_notes, RLS — giữ nguyên
- Các action khác (upgrade, extend, suspend...) — không ảnh hưởng

