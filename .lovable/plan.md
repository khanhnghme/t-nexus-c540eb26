

## Chuyển đổi sang PayPal Subscriptions API

### Tổng quan thay đổi

Hệ thống hiện tại dùng **Orders API** (thanh toán 1 lần) + cron `process-plan-cycle` để quản lý chu kỳ thủ công. Chuyển sang **Subscriptions API** để PayPal tự động thu phí định kỳ (monthly/yearly), giảm phức tạp server-side.

---

### 1. Database Migration

Thêm cột mới vào bảng `profiles`:
- `paypal_subscription_id` (text, nullable) — ID subscription từ PayPal
- `paypal_plan_id` (text, nullable) — ID plan PayPal đang active

Thêm cột mới vào bảng `orders`:
- `paypal_subscription_id` (text, nullable) — thay thế `paypal_order_id` cho subscription orders

Tạo bảng `paypal_plans` để map plan_key → PayPal Plan ID:
- `id`, `plan_key` (plan_plus, plan_pro, plan_business), `billing_cycle` (monthly/yearly), `paypal_plan_id`, `paypal_product_id`, `is_welcome` (boolean — giá welcome riêng), `price`, `created_at`

### 2. Edge Function: `setup-paypal-plans` (mới, chạy 1 lần)

Script khởi tạo Products & Plans trên PayPal:
- Tạo 1 Product ("T-Nexus Subscription")
- Tạo 6 Plans (3 gói × 2 chu kỳ) với giá tương ứng từ `PLAN_PRICES`
- Tạo thêm 6 Welcome Plans (giá khuyến mãi cho lần đầu)
- Lưu tất cả Plan IDs vào bảng `paypal_plans`

### 3. Edge Function: `create-paypal-order` → Đổi thành `create-paypal-subscription`

Thay đổi logic:
- Thay vì tạo Order, gọi `POST /v1/billing/subscriptions` với `plan_id` tương ứng
- Tra cứu `paypal_plans` để lấy đúng PayPal Plan ID theo (plan_key, billing_cycle, is_welcome)
- Response trả về `subscriptionID` + `approve_url` thay vì `orderID`
- Vẫn lưu order vào DB với status `pending` + `paypal_subscription_id`
- Coupon: áp dụng qua `plan.override` trong subscription request (giảm giá trực tiếp trên PayPal)

### 4. Edge Function: `capture-paypal-order` → Xóa hoặc giữ tương thích

- Subscriptions API **không cần capture** — PayPal tự thu tiền
- Giữ lại function nhưng chuyển sang chỉ xác nhận subscription status (gọi `GET /v1/billing/subscriptions/:id`)
- Nếu status = `ACTIVE` → cập nhật order + profile

### 5. Edge Function: `paypal-webhook` → Cập nhật events

Xử lý 4 events mới:

**`BILLING.SUBSCRIPTION.ACTIVATED`**:
- Tìm order theo `paypal_subscription_id`
- Cập nhật order → `completed`, profile → `user_plan`, `plan_status=active`, `paypal_subscription_id`
- Tính `plan_expires_at` (now + 1 month/1 year)
- Cập nhật workspace limits, payment_history, plan_change_logs

**`PAYMENT.SALE.COMPLETED`**:
- Kiểm tra `billing_agreement_id` trong resource → tìm profile theo `paypal_subscription_id`
- Nếu là lần gia hạn (không phải lần đầu): gia hạn `plan_expires_at` thêm 1 chu kỳ
- Ghi payment_history mới

**`BILLING.SUBSCRIPTION.CANCELLED`**:
- Tìm profile theo subscription ID
- Set `plan_status = 'cancelled'`, giữ plan đến hết `plan_expires_at`
- Khi hết hạn, `process-plan-cycle` sẽ chuyển về Free

**`BILLING.SUBSCRIPTION.PAYMENT.FAILED`**:
- Ghi log, gửi notification cho user
- Có thể set `plan_status = 'payment_failed'` để hiển thị cảnh báo

### 6. Client-side: `CheckoutPayment.tsx` + `AddonCheckoutPayment.tsx`

**Không đổi UI**, chỉ đổi logic PayPal Buttons:
- `createOrder` → thay bằng `createSubscription` prop của `<PayPalButtons>`
- Gọi `create-paypal-subscription` thay vì `create-paypal-order`
- `onApprove` → nhận `subscriptionID` thay vì `orderID`, gọi API xác nhận subscription active
- Background polling vẫn giữ nguyên (poll order status)

```text
// PayPalButtons prop thay đổi:
<PayPalButtons
  createSubscription={async () => subscriptionId}   // thay vì createOrder
  onApprove={async (data) => handleSubscriptionApproved(data.subscriptionID)}
  ...
/>
// PayPalScriptProvider options thêm vault=true, intent=subscription
```

### 7. `Checkout.tsx`, `AddonCheckout.tsx`, `FirstTimeOnboarding.tsx`

Tương tự: thay `createOrder` → `createSubscription`, cập nhật `onApprove` handler.

### 8. `process-plan-cycle` — Đơn giản hóa

- Vẫn xử lý hết hạn (downgrade to Free khi `plan_expires_at` qua và `plan_status = 'cancelled'`)
- Bỏ logic tự gia hạn (PayPal tự làm qua webhook `PAYMENT.SALE.COMPLETED`)
- Giữ logic scheduled downgrade (`next_plan`)

### 9. `get-paypal-config` — Cập nhật

Thêm `intent: 'subscription'` và `vault: true` vào response để client config đúng.

### 10. Addon-only orders

Addon không phải subscription (mua 1 lần). Giữ nguyên Orders API cho addon:
- `AddonCheckoutPayment.tsx` vẫn dùng `createOrder` + `capture`
- Chỉ plan orders chuyển sang Subscriptions

---

### Cần cấu hình trên PayPal Dashboard

Sau khi deploy `setup-paypal-plans`, cập nhật Webhook URL với events mới:
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `PAYMENT.SALE.COMPLETED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`

### Files cần tạo/sửa

| File | Hành động |
|------|-----------|
| `paypal_plans` table | Tạo mới (migration) |
| `profiles` table | Thêm 2 cột |
| `supabase/functions/setup-paypal-plans/index.ts` | Tạo mới |
| `supabase/functions/create-paypal-order/index.ts` | Đổi thành subscription logic |
| `supabase/functions/capture-paypal-order/index.ts` | Đổi thành verify subscription |
| `supabase/functions/paypal-webhook/index.ts` | Thay events hoàn toàn |
| `supabase/functions/process-plan-cycle/index.ts` | Đơn giản hóa |
| `supabase/functions/get-paypal-config/index.ts` | Thêm vault/intent |
| `src/pages/CheckoutPayment.tsx` | Đổi PayPal logic (giữ UI) |
| `src/pages/AddonCheckoutPayment.tsx` | Giữ nguyên (addon = 1 lần) |
| `src/pages/Checkout.tsx` | Đổi PayPal logic (giữ UI) |
| `src/pages/AddonCheckout.tsx` | Giữ nguyên |
| `src/components/FirstTimeOnboarding.tsx` | Đổi PayPal logic (giữ UI) |

