

## Plan: Đợt 2 — Post-payment UX + Webhook + ServicePlan real data

### Xác nhận: Đợt 1 đã hoàn thành
- Bảng `orders` + RLS
- Edge Functions: `create-paypal-order`, `capture-paypal-order`, `get-paypal-config`
- Trang Checkout với PayPal SDK, add-ons, coupon
- Route `/checkout` + Upgrade navigation
- i18n en/vi

### Đợt 2 — Scope

```text
1. Trang Success/Failure riêng biệt (thay inline trong Checkout)
2. PayPal Webhook edge function (idempotent)
3. ServicePlan hiển thị lịch sử thanh toán thật (thay MOCK_BILLING)
4. Email xác nhận thanh toán (cần setup email domain trước)
```

**Lưu ý email:** Dự án chưa có email domain. Phần email xác nhận sẽ được chuẩn bị sẵn code nhưng chỉ hoạt động sau khi setup email domain. Hoặc bỏ qua email ở đợt này, tập trung vào 3 phần còn lại.

---

### 1. Trang `/checkout/success` và `/checkout/failed`

**File: `src/pages/PaymentResult.tsx`**
- Route: `/checkout/result?status=success|failed&order_id=xxx`
- Success: animation check, tóm tắt đơn hàng (query orders by id), nút "Xem gói" → `/service-plan`
- Failed: thông báo lỗi, nút "Thử lại" → quay lại `/checkout`, nút "Liên hệ hỗ trợ"
- Cập nhật `Checkout.tsx`: thay `setPaymentStatus('success')` → `navigate('/checkout/result?status=success&order_id=xxx')`

### 2. PayPal Webhook Edge Function

**File: `supabase/functions/paypal-webhook/index.ts`**
- Verify webhook signature (PayPal Webhook ID từ secret `PAYPAL_WEBHOOK_ID`)
- Handle events:
  - `CHECKOUT.ORDER.APPROVED` → log only (capture đã xử lý phía client)
  - `PAYMENT.CAPTURE.COMPLETED` → idempotent update: check orders.status, nếu chưa completed thì update profiles + payment_history + plan_change_logs (backup cho trường hợp client capture thất bại)
  - `PAYMENT.CAPTURE.DENIED` / `PAYMENT.CAPTURE.REFUNDED` → update orders.status = 'failed'/'refunded'
- Idempotent: check `orders.paypal_order_id` + `status` trước khi update
- Secret cần thêm: `PAYPAL_WEBHOOK_ID`

### 3. ServicePlan — Lịch sử thanh toán thật

**File: `src/pages/ServicePlan.tsx`**
- Xóa `MOCK_BILLING` array
- Query `payment_history` WHERE user_id = current user, ORDER BY created_at DESC, LIMIT 20
- Hiển thị: transaction_id, created_at (formatted), plan, amount, status (badge màu)
- Empty state nếu chưa có giao dịch
- Giữ nguyên UI table hiện tại, chỉ thay data source

### 4. Cập nhật Route

**File: `src/App.tsx`**
- Thêm route `/checkout/result` → `PaymentResult`

### 5. i18n

Thêm ~15 chuỗi cho payment result page (en + vi)

---

### Files

| File | Thay đổi |
|------|----------|
| `src/pages/PaymentResult.tsx` | Trang mới: kết quả thanh toán |
| `src/pages/Checkout.tsx` | Redirect sang PaymentResult thay vì inline |
| `src/pages/ServicePlan.tsx` | Thay mock data bằng query payment_history |
| `src/App.tsx` | Thêm route /checkout/result |
| `supabase/functions/paypal-webhook/index.ts` | Edge function webhook PayPal |
| `src/lib/i18n/en.ts` | Thêm chuỗi paymentResult |
| `src/lib/i18n/vi.ts` | Thêm chuỗi paymentResult |

