

## Plan: Chuẩn hóa flow 3 bước & cải thiện trang kết quả

### Tổng quan
1. Xóa popup chi tiết giao dịch ở Billing History
2. Chuyển `PaymentResult` thành Step 3 (Summary) với route `/checkout/:orderId/summary`
3. Step 3 hiển thị kết quả cuối cùng cho mọi trạng thái (success/failed/cancelled/expired)
4. Thêm progress bar 3 bước (Order → Payment → Summary)

### Thay đổi chi tiết

#### 1. `src/pages/BillingHistory.tsx` — Xóa popup chi tiết
- Xóa import `UserPaymentDetailDialog`
- Xóa state `selectedPayment`
- Xóa `onClick={() => setSelectedPayment(row.raw)}` trên mỗi `<tr>`
- Xóa component `<UserPaymentDetailDialog />`
- Xóa `cursor-pointer` class trên `<tr>`

#### 2. Tạo `src/pages/CheckoutSummary.tsx` — Step 3 (Summary)
- Route: `/checkout/:orderId/summary`
- Load order từ DB, kiểm tra user ownership
- Nếu order vẫn `pending` → redirect về `/checkout/:orderId` (vẫn ở step 2)
- Progress UI: 3 bước Order → Payment → Summary (luôn ở bước 3)
- Hiển thị theo status:
  - **success**: icon xanh, chi tiết đơn hàng đầy đủ (mã đơn, plan, giá gốc/giảm/tổng, thời gian tạo, thời gian thanh toán), nút "Đi đến Dashboard" + "Xem gói"
  - **failed**: icon đỏ, chi tiết đơn + thời gian thất bại, nút "Thanh toán lại"
  - **cancelled**: icon cam, chi tiết + thời gian hủy, nút "Tạo đơn mới"
  - **expired**: icon xám, chi tiết + thời gian hết hạn, nút "Tạo đơn mới"

#### 3. `src/pages/CheckoutPayment.tsx` — Redirect sang Summary
- Khi `onApprove` thành công → navigate `/checkout/:orderId/summary` thay vì `/checkout/result?...`
- Khi failed → navigate `/checkout/:orderId/summary`
- Khi order đã completed/cancelled/expired → redirect sang `/checkout/:orderId/summary`
- Thêm progress bar 3 bước ở header (đang ở bước 2)

#### 4. `src/pages/AddonCheckoutPayment.tsx` — Tương tự
- Redirect sang `/checkout/:orderId/summary` cho mọi kết quả

#### 5. `src/pages/Checkout.tsx` — Thêm progress bước 1
- Thêm progress UI 3 bước (đang ở bước 1)

#### 6. `src/App.tsx` — Cập nhật routes
- Thêm `/checkout/:orderId/summary` → `CheckoutSummary`
- Giữ `/checkout/result` tạm thời để backward-compatible, redirect sang summary

#### 7. Xóa `src/pages/PaymentResult.tsx` (hoặc chuyển thành redirect)
- Chuyển thành redirect component: đọc query params → redirect sang `/checkout/:orderId/summary`

### Files

| File | Action |
|---|---|
| `src/pages/CheckoutSummary.tsx` | Create — Step 3 Summary page |
| `src/pages/CheckoutPayment.tsx` | Edit — redirect to summary, add progress |
| `src/pages/AddonCheckoutPayment.tsx` | Edit — redirect to summary |
| `src/pages/Checkout.tsx` | Edit — add step progress |
| `src/pages/BillingHistory.tsx` | Edit — remove popup dialog |
| `src/pages/PaymentResult.tsx` | Edit — convert to redirect |
| `src/App.tsx` | Edit — add summary route |

