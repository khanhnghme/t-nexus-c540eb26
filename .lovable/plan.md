

## Plan: Admin Billing Dashboard + Plans Management + Coupon Module

### Tổng quan
Chuyển đổi trang `/admin/billing` từ danh sách user đơn giản thành một **SaaS Admin Dashboard** đầy đủ với dashboard tổng quan, quản lý gói, và module coupon.

### Cấu trúc trang mới

```text
/admin/billing
├── Dashboard Header (KPI cards)
│   ├── Total Revenue (tháng)
│   ├── Successful / Failed Payments
│   ├── New / Renewed / Cancelled
│   └── Active Users by Plan (mini bar)
│
├── Tabs Navigation
│   ├── Overview (dashboard charts + stats)
│   ├── Users (danh sách user hiện tại - giữ nguyên)
│   ├── Plans (quản lý gói dịch vụ)
│   ├── Transactions (giao dịch gần đây)
│   └── Coupons (quản lý mã giảm giá)
```

### 1. Migration SQL — Bảng `coupons`

```sql
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
  discount_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  max_uses integer, -- NULL = unlimited
  used_count integer NOT NULL DEFAULT 0,
  applicable_plans text[] DEFAULT '{}', -- empty = all plans
  min_plan text, -- minimum plan required
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));
```

### 2. Component `AdminBillingDashboard.tsx` — KPI Cards
- Query `profiles` để đếm user theo plan: `COUNT(*) GROUP BY user_plan`
- Query `profiles` để đếm theo plan_status
- Query `payment_history` tháng hiện tại: tổng revenue, count by status
- Query `plan_change_logs` tháng hiện tại: count upgrade/downgrade/renew/cancel
- Hiển thị 6 KPI cards: Revenue, Payments OK, Payments Failed, New Signups, Renewals, Cancellations
- Bên dưới: Plan Distribution bar chart (horizontal stacked) + mini table user count per plan

### 3. Refactor `AdminBilling.tsx` — Tabs Layout
Chuyển từ flat list sang tabbed layout:
- **Overview** tab: render `AdminBillingDashboard`
- **Users** tab: giữ nguyên table users hiện tại (move logic vào `AdminBillingUsersTab.tsx`)
- **Plans** tab: render `AdminPlansTab`
- **Transactions** tab: render `AdminTransactionsTab`
- **Coupons** tab: render `AdminCouponsTab`

### 4. Component `AdminBillingUsersTab.tsx`
- Di chuyển toàn bộ logic filter + table users hiện tại từ `AdminBilling.tsx` vào component riêng
- Giữ nguyên UI, chỉ tách file

### 5. Component `AdminPlansTab.tsx` — Quản lý gói
- Query `plan_limits` để lấy danh sách plans
- Query `profiles` COUNT GROUP BY user_plan để lấy số user mỗi plan
- Hiển thị dạng card grid (1 card/plan):
  - Tên plan + badge màu
  - Giá (hardcoded vì chưa có bảng price — hiển thị từ constant)
  - Billing cycles available
  - Limits: projects, members, storage, workspaces
  - Active users count + % tổng
  - Status badge (active/deprecated)
- Read-only (chưa cho edit plan_limits qua UI — sẽ mở rộng sau)

### 6. Component `AdminTransactionsTab.tsx`
- Query `payment_history` toàn bộ (không filter by user)
- Filters: search, status, date range
- Table: user name, transaction_id, plan, amount, status, paid_at
- Click row → mở `PaymentDetailDialog` (đã có)

### 7. Component `AdminCouponsTab.tsx` — Module mã giảm giá
- Query bảng `coupons`
- Table hiển thị: code, type (% / fixed), value, uses (used/max), applicable plans, status, expires
- Nút "Create Coupon" → mở `CouponFormDialog`
- Toggle active/inactive trực tiếp trên row
- Click row → xem chi tiết + edit

### 8. Component `CouponFormDialog.tsx`
- Form fields:
  - Code (text, auto-generate option)
  - Discount type: percentage / fixed amount
  - Discount value
  - Max uses (optional)
  - Applicable plans (multi-select checkboxes)
  - Valid from / Valid until (date pickers)
  - Description
  - Active toggle
- Validate: value > 0, percentage <= 100, dates logic
- Insert/Update vào bảng `coupons`

### 9. i18n (en.ts + vi.ts)
Thêm block `adminBilling.dashboard`, `adminBilling.plans`, `adminBilling.transactions`, `adminBilling.coupons` với ~60 chuỗi mỗi ngôn ngữ.

### Triển khai chia đợt

**Lần này (1 message):**
- Migration: tạo bảng `coupons`
- Refactor `AdminBilling.tsx` → tabs layout
- Tạo `AdminBillingDashboard.tsx` (KPI cards + stats)
- Tạo `AdminBillingUsersTab.tsx` (tách từ AdminBilling)
- Tạo `AdminPlansTab.tsx` (plan cards)
- Tạo `AdminTransactionsTab.tsx` (global transactions)
- Tạo `AdminCouponsTab.tsx` + `CouponFormDialog.tsx`
- i18n en + vi

### Files

| File | Thay đổi |
|------|----------|
| Migration SQL | Tạo bảng `coupons` + RLS |
| `src/pages/AdminBilling.tsx` | Refactor hoàn toàn → tabs layout |
| `src/components/admin/AdminBillingDashboard.tsx` | Component mới: KPI cards + stats |
| `src/components/admin/AdminBillingUsersTab.tsx` | Component mới: tách users table |
| `src/components/admin/AdminPlansTab.tsx` | Component mới: plan management cards |
| `src/components/admin/AdminTransactionsTab.tsx` | Component mới: global transactions |
| `src/components/admin/AdminCouponsTab.tsx` | Component mới: coupon management |
| `src/components/admin/CouponFormDialog.tsx` | Component mới: form tạo/sửa coupon |
| `src/lib/i18n/en.ts` | Thêm ~60 chuỗi dashboard/plans/transactions/coupons |
| `src/lib/i18n/vi.ts` | Thêm ~60 chuỗi tương ứng |

