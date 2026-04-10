

## Phân tích lỗi & Kế hoạch sửa

### Nguyên nhân gốc

**Bug 1: Race condition — Subscription chưa ACTIVE khi capture được gọi**

Khi user approve trên PayPal popup → `onApprove` gọi `capture-paypal-order` ngay lập tức. Nhưng PayPal Subscriptions API có delay — subscription status có thể vẫn là `APPROVAL_PENDING` chứ chưa `ACTIVE`. 

Capture function (line 177) trả về `{ success: false, status: "APPROVAL_PENDING" }` → Frontend coi đây là lỗi (line 149: `!res.data?.success`) → `setPaymentStatus('failed')`.

**Bug 2: Background polling dừng khi failed**

Line 47: polling chỉ chạy khi `paymentStatus === 'idle' || 'processing'`. Khi capture thất bại → `paymentStatus = 'failed'` → polling dừng. Dù webhook đã hoàn thành order trong DB, frontend không biết.

**Bug 3: `onApprove` không set `paymentStatus = 'success'`**

Luồng thành công: toast success → refreshProfile → pollOrderStatus → navigate. Nhưng `paymentStatus` vẫn là `'processing'` suốt quá trình này. Nếu bất kỳ await nào chậm, user thấy spinner "Đang xác nhận" dù toast đã hiện "thành công".

### Kế hoạch sửa

**1. `capture-paypal-order/index.ts`**: Khi subscription chưa ACTIVE, trả `{ success: true, pending: true }` thay vì `{ success: false }`, để frontend không coi là lỗi mà tiếp tục polling.

**2. `CheckoutPayment.tsx` — Sửa `onApprove`**:
- Nếu capture trả `success: true` (dù pending hay không) → set `paymentStatus = 'success'` → navigate
- Nếu capture trả `pending: true` → không throw error, chỉ tiếp tục polling chờ webhook hoàn thành
- Set `paymentStatus = 'success'` TRƯỚC khi navigate

**3. `CheckoutPayment.tsx` — Background polling**: Cho phép polling tiếp tục cả khi `paymentStatus === 'failed'`, vì webhook vẫn có thể hoàn thành order.

**4. Áp dụng tương tự cho**: `AddonCheckoutPayment.tsx`, `Checkout.tsx`, `FirstTimeOnboarding.tsx`

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/capture-paypal-order/index.ts` | Trả `success: true, pending: true` khi subscription chưa ACTIVE |
| `src/pages/CheckoutPayment.tsx` | Fix onApprove + polling logic |
| `src/pages/AddonCheckoutPayment.tsx` | Fix tương tự |
| `src/pages/Checkout.tsx` | Fix tương tự |
| `src/components/FirstTimeOnboarding.tsx` | Fix tương tự |

