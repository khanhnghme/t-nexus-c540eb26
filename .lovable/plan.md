

## Plan: Chuyển URL checkout từ UUID sang Order Code

### Tổng quan
Thay thế UUID trong URL checkout bằng `order_code` (ORD-YYYYMM-XXXXXXXXX). Tất cả routing, navigation, và data fetching sẽ dùng `order_code` thay vì `id`.

### Thay đổi

#### 1. `src/App.tsx` — Đổi route params
- `/checkout/:orderId` → `/checkout/payment/:orderCode`
- `/checkout/:orderId/summary` → `/checkout/summary/:orderCode`
- `/addon-checkout/:orderId` → `/addon-checkout/:orderCode` (giữ pattern nhưng dùng order_code)

#### 2. `src/pages/Checkout.tsx` — `createReservation` trả về `order_code`
- Select thêm `order_code` khi insert order
- Navigate dùng `order_code`: `navigate('/checkout/payment/' + data.order_code)`

#### 3. `src/pages/AddonCheckout.tsx` — Tương tự
- Select thêm `order_code` khi insert
- Navigate dùng `order_code`

#### 4. `src/pages/CheckoutPayment.tsx` — Fetch bằng `order_code`
- `useParams` lấy `orderCode` thay vì `orderId`
- Query: `.eq('order_code', orderCode)` thay vì `.eq('id', orderId)`
- Tất cả navigate sang summary dùng `/checkout/summary/{orderCode}`

#### 5. `src/pages/AddonCheckoutPayment.tsx` — Tương tự
- Fetch bằng `order_code`, navigate bằng `order_code`

#### 6. `src/pages/CheckoutSummary.tsx` — Fetch bằng `order_code`
- `useParams` lấy `orderCode`
- Query: `.eq('order_code', orderCode)`
- Redirect pending → `/checkout/payment/{orderCode}` hoặc `/addon-checkout/{orderCode}`
- Retry payment → dùng `order_code`

#### 7. `src/pages/BillingHistory.tsx` — Navigate bằng `order_code`
- Dùng `row.raw?.order_code` thay vì `row.order_id || row.id` khi navigate
- Summary: `/checkout/summary/{order_code}`
- Continue payment: `/checkout/payment/{order_code}` hoặc `/addon-checkout/{order_code}`

#### 8. `src/pages/PaymentResult.tsx` — Cập nhật redirect
- Redirect sang `/checkout/summary/{orderCode}` (cần query order_code từ order_id nếu có)

#### 9. Edge function `create-paypal-order` — Đảm bảo trả `order_code`
- Đã có từ lần trước, chỉ verify

### Files

| File | Action |
|---|---|
| `src/App.tsx` | Edit — đổi route paths |
| `src/pages/Checkout.tsx` | Edit — select + navigate bằng order_code |
| `src/pages/AddonCheckout.tsx` | Edit — select + navigate bằng order_code |
| `src/pages/CheckoutPayment.tsx` | Edit — fetch + navigate bằng order_code |
| `src/pages/AddonCheckoutPayment.tsx` | Edit — fetch + navigate bằng order_code |
| `src/pages/CheckoutSummary.tsx` | Edit — fetch + navigate bằng order_code |
| `src/pages/BillingHistory.tsx` | Edit — navigate bằng order_code |
| `src/pages/PaymentResult.tsx` | Edit — redirect bằng order_code |

