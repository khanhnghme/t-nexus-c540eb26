

## Plan: Tách Step 2 thành route riêng `/checkout/:orderId`

### Tổng quan
Tách phần thanh toán (Step 2) thành một trang riêng với URL `/checkout/:orderId`, cho phép truy cập lại, reload, và liên kết từ Billing History.

### Thay đổi

#### 1. Tạo `src/pages/CheckoutPayment.tsx` — Trang Step 2 riêng
- Route mới: `/checkout/:orderId`
- Load order data từ DB theo `orderId` param (plan, cycle, amounts, status, expires_at...)
- Nếu order không tồn tại hoặc không thuộc user → redirect về `/billing-history`
- Nếu order đã completed/cancelled/expired → hiển thị trạng thái tương ứng
- Hiển thị: mã đơn hàng, OrderCountdown, order summary table, PayPal buttons, nút hủy đơn
- Tái sử dụng logic PayPal `createOrder` + `onApprove` từ Checkout.tsx hiện tại

#### 2. Cập nhật `src/pages/Checkout.tsx` — Chỉ giữ Step 1
- Xóa toàn bộ Step 2 UI (từ dòng ~639 đến cuối)
- Xóa các state liên quan Step 2: `orderReservation`, `orderExpired`, `showCancelDialog`, `cancellingOrder`
- Sau khi `createReservation` thành công → `navigate('/checkout/' + orderId)` thay vì `setStep(2)`
- Xóa state `step` (không cần nữa, trang này luôn là Step 1)

#### 3. Cập nhật `src/pages/AddonCheckout.tsx` — Tương tự
- Tạo `src/pages/AddonCheckoutPayment.tsx` cho route `/addon-checkout/:orderId`
- AddonCheckout chỉ giữ Step 1, sau confirm → navigate tới `/addon-checkout/:orderId`

#### 4. Cập nhật `src/pages/BillingHistory.tsx`
- Nút "Tiếp tục thanh toán" → navigate tới `/checkout/:orderId` hoặc `/addon-checkout/:orderId`
- Thêm giây vào `formatDateTime` (HH:mm:ss)

#### 5. Cập nhật `src/App.tsx` — Thêm routes
- `/checkout/:orderId` → `CheckoutPayment`
- `/addon-checkout/:orderId` → `AddonCheckoutPayment`

### Files

| File | Action |
|---|---|
| `src/pages/CheckoutPayment.tsx` | Create — Step 2 cho plan checkout |
| `src/pages/AddonCheckoutPayment.tsx` | Create — Step 2 cho addon checkout |
| `src/pages/Checkout.tsx` | Edit — xóa Step 2, navigate sau reservation |
| `src/pages/AddonCheckout.tsx` | Edit — xóa Step 2, navigate sau reservation |
| `src/pages/BillingHistory.tsx` | Edit — cập nhật navigate URL + format thời gian |
| `src/App.tsx` | Edit — thêm 2 routes mới |

