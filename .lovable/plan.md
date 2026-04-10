

## Giai đoạn 1: Backend Infrastructure — PayPal Subscriptions API

### 1. Database Migration

**Bảng mới `paypal_plans`:**
```sql
CREATE TABLE paypal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,           -- plan_plus, plan_pro, plan_business
  billing_cycle text NOT NULL,       -- monthly, yearly
  paypal_product_id text NOT NULL,
  paypal_plan_id text NOT NULL,
  is_welcome boolean DEFAULT false,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_key, billing_cycle, is_welcome)
);
```

**Thêm cột vào `profiles`:**
- `paypal_subscription_id text` (nullable)
- `paypal_plan_id text` (nullable)

**Thêm cột vào `orders`:**
- `paypal_subscription_id text` (nullable)

---

### 2. Edge Function mới: `setup-paypal-plans`

Chạy 1 lần để khởi tạo trên PayPal:
- Tạo 1 Product ("T-Nexus Subscription") via `POST /v1/catalogs/products`
- Tạo 12 Plans (3 gói × 2 chu kỳ × 2 giá regular/welcome) via `POST /v1/billing/plans`
- Lưu tất cả Plan IDs vào bảng `paypal_plans`
- Giá lấy từ `PLAN_PRICES` và `WELCOME_PRICES` hiện có

---

### 3. Viết lại `create-paypal-order/index.ts` → Subscription logic

Thay đổi chính:
- Tra cứu `paypal_plans` để lấy `paypal_plan_id` theo (plan_key, billing_cycle, is_welcome)
- Gọi `POST /v1/billing/subscriptions` thay vì `POST /v2/checkout/orders`
- Coupon → dùng `plan.billing_cycles[].pricing_scheme.fixed_price` override để giảm giá chu kỳ đầu
- Addon cũng tạo subscription (tạo PayPal plan addon riêng nếu cần, hoặc dùng `setup_fee`)
- Response trả `subscriptionID` + approve link
- Lưu order với `paypal_subscription_id` thay vì `paypal_order_id`

---

### 4. Viết lại `capture-paypal-order/index.ts` → Verify Subscription

- Xóa logic capture cũ
- Gọi `GET /v1/billing/subscriptions/:id` để kiểm tra status
- Nếu `ACTIVE` → cập nhật order `completed`, profile plan/subscription_id
- Đây là fallback cho webhook — nếu webhook đã xử lý rồi thì skip (idempotent)

---

### 5. Viết lại hoàn toàn `paypal-webhook/index.ts`

Xóa handlers cũ (`CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED/REFUNDED`).

4 handlers mới:

| Event | Logic |
|-------|-------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Tìm order → completed, update profile (plan, expires_at, paypal_subscription_id), workspace limits, payment_history, plan_change_logs |
| `PAYMENT.SALE.COMPLETED` | Tìm profile qua `billing_agreement_id` → gia hạn `plan_expires_at` thêm 1 chu kỳ, ghi payment_history |
| `BILLING.SUBSCRIPTION.CANCELLED` | Set `plan_status='cancelled'`, giữ plan đến hết expires_at |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | Set `plan_status='payment_failed'`, ghi log |

Giữ nguyên signature verification logic.

---

### 6. Đơn giản hóa `process-plan-cycle/index.ts`

- Giữ: downgrade to Free khi `plan_expires_at` qua + `plan_status IN ('cancelled', 'payment_failed')`
- Giữ: scheduled downgrade (`next_plan`)
- Bỏ: logic auto_renew (PayPal tự lo qua `PAYMENT.SALE.COMPLETED`)

---

### 7. Cập nhật `get-paypal-config/index.ts`

Thêm `vault: true` và `intent: 'subscription'` vào response.

---

### Tổng kết files

| File | Hành động |
|------|-----------|
| DB migration | Tạo bảng `paypal_plans`, thêm 3 cột |
| `supabase/functions/setup-paypal-plans/index.ts` | Tạo mới |
| `supabase/functions/create-paypal-order/index.ts` | Viết lại |
| `supabase/functions/capture-paypal-order/index.ts` | Viết lại |
| `supabase/functions/paypal-webhook/index.ts` | Viết lại hoàn toàn |
| `supabase/functions/process-plan-cycle/index.ts` | Đơn giản hóa |
| `supabase/functions/get-paypal-config/index.ts` | Cập nhật response |

Frontend không đổi trong giai đoạn này.

