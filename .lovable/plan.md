

## Plan: Đợt 1 — Database Foundation + Module 1 (Admin Billing Overview)

### Scope

Tạo nền tảng DB (3 bảng mới + mở rộng profiles) và trang Admin Billing với danh sách users + tab Overview chi tiết gói.

### 1. Migration SQL

**Mở rộng `profiles`** — thêm 5 cột:
```sql
ALTER TABLE profiles ADD COLUMN plan_status text NOT NULL DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN plan_source text NOT NULL DEFAULT 'self_paid';
ALTER TABLE profiles ADD COLUMN plan_started_at timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN plan_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly';
ALTER TABLE profiles ADD COLUMN auto_renew boolean NOT NULL DEFAULT false;
```

**Tạo `plan_change_logs`**:
- Columns: id, user_id, action_type, old_plan, new_plan, old_expires_at, new_expires_at, change_source, reason, internal_note, effective_mode, performed_by, metadata (jsonb), created_at
- RLS: chỉ system_admin SELECT/INSERT

**Tạo `admin_notes`**:
- Columns: id, user_id, note_type (general/support/warning/vip/abuse/partner), content, created_by, created_at
- RLS: chỉ system_admin CRUD

**Tạo `payment_history`**:
- Columns: id, user_id, transaction_id, order_id, invoice_id, plan_purchased, amount, currency, original_amount, discount_amount, final_amount, payment_method, status, coupon_code, description, system_note, paid_at, created_at
- RLS: chỉ system_admin SELECT/INSERT

### 2. AdminSidebarNav — thêm mục "Billing"
- Icon: `CreditCard` từ lucide-react
- Route: `/admin/billing`
- i18n key: `sidebar.billing` → "Billing" / "Thanh toán"

### 3. Route — `/admin/billing` + `/admin/billing/:userId`
- Thêm vào `App.tsx` trong admin route group
- Import lazy: `AdminBilling` page

### 4. Trang `AdminBilling.tsx` — Danh sách users
- Fetch tất cả profiles (system_admin only)
- Bảng hiển thị: Avatar, Name, Email, Current Plan (badge màu), Plan Status (badge), Expiry Date, Actions
- Bộ lọc: search by name/email, filter by plan, filter by status
- Click row → navigate `/admin/billing/:userId`

### 5. Trang `AdminUserBilling.tsx` — Chi tiết user (4 tabs)
- **Tab Overview** (Đợt 1 — implement đầy đủ):
  - User info: avatar, name, email, user_id
  - Plan card: gói hiện tại, status badge, source badge, billing_cycle, auto_renew toggle (display only)
  - Dates: started_at, expires_at
  - Current limits: workspace/project/member/storage từ plan_limits
  - Current usage: đếm thực tế từ DB
  - Quick action buttons (placeholder): Upgrade, Downgrade, Extend, Suspend, Restore, Add Note
- **Tab Payments** — placeholder "Coming in Phase 2"
- **Tab Plan History** — placeholder "Coming in Phase 2"
- **Tab Notes** — placeholder "Coming in Phase 2"

### 6. i18n
- `en.ts` + `vi.ts`: thêm block `adminBilling` với ~30 chuỗi (sidebar label, table headers, tab names, status labels, source labels, cycle labels, placeholder messages)

### Files

| File | Thay đổi |
|------|----------|
| Migration SQL | 5 cột profiles + 3 bảng mới + RLS |
| `src/components/AdminSidebarNav.tsx` | Thêm Billing item |
| `src/App.tsx` | Thêm 2 route admin/billing |
| `src/pages/AdminBilling.tsx` | Trang mới: danh sách users + filters |
| `src/pages/AdminUserBilling.tsx` | Trang mới: chi tiết user 4 tabs (Overview full, 3 tabs placeholder) |
| `src/lib/i18n/en.ts` | Thêm block adminBilling |
| `src/lib/i18n/vi.ts` | Thêm block adminBilling |

