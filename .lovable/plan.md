

## Plan: Cập nhật UI thanh toán Step 2 & Lịch sử thanh toán

### Thay đổi

#### 1. Checkout.tsx — Step 2: Thêm nút "Hủy đơn hàng"
- Thêm state `showCancelDialog` và logic xác nhận hủy
- Thêm nút "Hủy đơn hàng" (màu destructive outline) bên cạnh OrderCountdown
- Dialog xác nhận: "Bạn có chắc muốn hủy đơn hàng này?" + 2 nút (Hủy / Xác nhận)
- Khi xác nhận: update order status = 'cancelled' trong DB, reset về Step 1, toast thông báo

#### 2. Checkout.tsx — Step 2: Hiển thị rõ mã đơn + countdown
- OrderCountdown đã có sẵn, nhưng bổ sung hiển thị mã đơn hàng lớn hơn ngay dưới header Step 2
- Đảm bảo orderId và countdown hiển thị rõ ràng

#### 3. AddonCheckout.tsx — Tương tự
- Thêm nút "Hủy đơn hàng" + dialog xác nhận giống Checkout.tsx

#### 4. BillingHistory.tsx — Hiển thị chi tiết hơn
- Cột "Ngày": đổi `formatDate` để hiển thị đầy đủ giờ:phút (`dd/MM/yyyy HH:mm`)
- Thêm cột "Thanh toán lúc" (`paid_at`) — hiển thị datetime đầy đủ hoặc "—" nếu chưa thanh toán
- Nút "Tiếp tục thanh toán" đã có, giữ nguyên

### Files

| File | Action |
|---|---|
| `src/pages/Checkout.tsx` | Add cancel order button + confirmation dialog |
| `src/pages/AddonCheckout.tsx` | Add cancel order button + confirmation dialog |
| `src/pages/BillingHistory.tsx` | Improve date format (add HH:mm), add paid_at column |

