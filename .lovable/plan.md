

## Plan: Triển khai Thanh toán Web — PayPal (Phase 1)

### Tổng quan

Xây dựng luồng thanh toán thực tế cho trang `/upgrade`, thay thế toast "đang phát triển" bằng flow checkout hoàn chỉnh với PayPal. Thiết kế scalable để sau thêm Momo dễ dàng.

### Kiến trúc

```text
User chọn Plan → Checkout Page/Dialog
  ├── Order Summary (plan + add-ons + coupon)
  ├── Apply Coupon (từ bảng coupons đã có)
  ├── Chọn Payment Method (PayPal / Momo disabled)
  ├── PayPal Button → Edge Function tạo order
  ├── PayPal Approve → Edge Function capture
  └── Success → update profiles + payment_history + plan_change_logs
```

### Chia đợt triển khai

---

**ĐỢT 1 — Checkout UI + Edge Functions (PayPal)**

#### 1. Migration SQL
- Thêm cột `billing_cycle` vào `payment_history` (monthly/yearly)
- Thêm bảng `orders` (tạm giữ trạng thái order trước khi PayPal confirm):
  ```sql
  CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    plan text NOT NULL,
    billing_cycle text NOT NULL DEFAULT 'monthly',
    base_amount numeric NOT NULL DEFAULT 0,
    addon_amount numeric NOT NULL DEFAULT 0,
    discount_amount numeric NOT NULL DEFAULT 0,
    total_amount numeric NOT NULL DEFAULT 0,
    coupon_code text,
    addons jsonb DEFAULT '[]',
    payment_method text NOT NULL DEFAULT 'paypal',
    paypal_order_id text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
  );
  ```
  RLS: user chỉ xem/tạo order của mình, system admin xem tất cả.

#### 2. Edge Function `create-paypal-order`
- Nhận: `{ plan, billing_cycle, addons[], coupon_code? }`
- Validate coupon (nếu có) — check bảng `coupons`: is_active, expires_at, used_count < max_uses, applicable_plans
- Tính tổng: base price + addon price - discount
- Gọi PayPal REST API `POST /v2/checkout/orders` tạo order
- Lưu vào bảng `orders` với status = 'pending'
- Trả về PayPal order ID cho client

#### 3. Edge Function `capture-paypal-order`
- Nhận: `{ paypal_order_id }`
- Gọi PayPal API `POST /v2/checkout/orders/{id}/capture`
- Nếu thành công:
  - Update `orders.status = 'completed'`
  - Update `profiles.user_plan`, `plan_status`, `plan_started_at`, `plan_expires_at`
  - Insert `payment_history` record
  - Insert `plan_change_logs` record
  - Update `coupons.used_count` nếu dùng coupon
  - Update `user_addons` nếu có addon
- Trả về success/failure

#### 4. Trang Checkout (`src/pages/Checkout.tsx`)
- Route: `/checkout?plan=pro&cycle=monthly`
- Sections:
  - **Order Summary**: tên gói, giá, chu kỳ
  - **Add-ons** (optional): hiển thị 3 loại add-on với +/- buttons
  - **Coupon Input**: ô nhập mã + nút "Áp dụng" → validate realtime
  - **Price Breakdown**: Subtotal, Add-ons, Discount, Total — hiển thị rõ ràng
  - **Payment Method**: PayPal button (active) + Momo (coming soon, disabled)
  - **PayPal Button**: sử dụng `@paypal/react-paypal-js` SDK

#### 5. Cập nhật `Upgrade.tsx`
- Thay `handleSelectPlan` toast → `navigate('/checkout?plan=xxx&cycle=monthly|yearly')`
- Giữ nguyên nếu user không phải owner

#### 6. Secrets cần thiết
- `PAYPAL_CLIENT_ID` (publishable → lưu trong code/env)
- `PAYPAL_CLIENT_SECRET` (secret → dùng add_secret tool)

#### 7. i18n
- Thêm block `checkout` (~30 chuỗi): order summary, apply coupon, payment method, success/error messages

---

**ĐỢT 2 — Post-payment UX + Webhook**

- Trang Success/Failure sau thanh toán
- PayPal Webhook edge function (đảm bảo idempotent)
- Email xác nhận thanh toán (dùng Resend)
- Cập nhật ServicePlan hiển thị lịch sử thanh toán thật (thay mock data)

---

**ĐỢT 3 — Momo Integration (tương lai)**

- Edge function `create-momo-order` / `momo-webhook`
- Detect locale → suggest payment method
- UI: thêm Momo button khi user ở Việt Nam

---

### Files — Đợt 1

| File | Thay đổi |
|------|----------|
| Migration SQL | Tạo bảng `orders` |
| `supabase/functions/create-paypal-order/index.ts` | Edge function tạo PayPal order |
| `supabase/functions/capture-paypal-order/index.ts` | Edge function capture + update DB |
| `src/pages/Checkout.tsx` | Trang checkout mới |
| `src/App.tsx` | Thêm route `/checkout` |
| `src/pages/Upgrade.tsx` | Điều hướng sang checkout thay vì toast |
| `src/lib/i18n/en.ts` | Thêm chuỗi checkout |
| `src/lib/i18n/vi.ts` | Thêm chuỗi checkout |

