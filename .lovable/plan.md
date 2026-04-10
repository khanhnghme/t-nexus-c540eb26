

## Plan: Cập nhật UI phản ánh Order Reservation

### Tổng quan
Thêm các yếu tố trực quan vào Step 2 (thanh toán) của cả `Checkout.tsx` và `AddonCheckout.tsx` để user thấy rõ đơn hàng có thời hạn, cùng trạng thái order. Cập nhật `PaymentResult.tsx` hiển thị thêm thông tin reservation.

### Thay đổi cụ thể

#### 1. Tạo component `OrderCountdown.tsx`
- Hiển thị countdown timer từ `expires_at` (đếm ngược 2h)
- Icon đồng hồ + text "Đơn hàng hết hạn sau: HH:MM:SS"
- Khi < 10 phút → đổi sang màu đỏ cảnh báo
- Khi hết hạn → hiển thị "Đơn hàng đã hết hạn" + nút "Tạo đơn mới"
- Dùng `useEffect` + `setInterval` mỗi giây

#### 2. Cập nhật `Checkout.tsx` (Step 2)
- Sau khi `createOrder` trả về, lưu `orderId` + `expiresAt` vào state
- Hiển thị mã đơn hàng (Order ID truncated) + `OrderCountdown` ngay dưới header Step 2
- Thêm badge trạng thái: "⏳ Đang chờ thanh toán" (pending)
- Nếu order expired → disable PayPal buttons, hiển thị nút quay lại Step 1

#### 3. Cập nhật `AddonCheckout.tsx` (Step 2)
- Tương tự Checkout: hiển thị Order ID + countdown timer
- Disable payment khi hết hạn

#### 4. Cập nhật `PaymentResult.tsx`
- Hiển thị thêm Order ID (truncated)
- Hiển thị thời gian hoàn thành (`completed_at`)
- Nếu status = expired → hiển thị UI riêng "Đơn hàng đã hết hạn"

### Flow thay đổi
- Step 1: Không thay đổi (chọn plan/addon)
- Step 2: Order được tạo khi bấm "Continue to Pay" → hiển thị countdown + order ID
- Hết hạn: Tự động disable thanh toán, hiển thị thông báo

### Không thay đổi
- Backend logic, API, database
- Step 1 UI
- Tính giá, coupon logic

### Files

| File | Action |
|---|---|
| `src/components/OrderCountdown.tsx` | Create — countdown timer component |
| `src/pages/Checkout.tsx` | Edit — add order reservation UI in Step 2 |
| `src/pages/AddonCheckout.tsx` | Edit — add order reservation UI in Step 2 |
| `src/pages/PaymentResult.tsx` | Edit — show order ID, timestamps, expired state |

