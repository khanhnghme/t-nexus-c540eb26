

## Nâng cấp trạng thái "Processing" tại Step 2

### Vấn đề hiện tại
- **CheckoutPayment.tsx**: Có full-screen processing overlay nhưng chỉ hiển thị "Đang xử lý thanh toán..." -- thiếu cảnh báo không thoát trang
- **AddonCheckoutPayment.tsx**: Processing chỉ hiển thị spinner nhỏ trong payment card, không có cảnh báo

### Thay đổi

#### 1. Nâng cấp Processing UI trong `CheckoutPayment.tsx` (dòng 157-163)
Thay thế overlay đơn giản bằng một Card chuyên nghiệp hơn:
- Spinner lớn hơn với animation
- Tiêu đề: "Đang xác nhận thanh toán với PayPal" / "Confirming payment with PayPal"
- Cảnh báo vàng (amber): "⚠️ Vui lòng không thoát hoặc tải lại trang" / "Please do not leave or reload this page"
- Hiển thị mã đơn hàng đang xử lý
- Thanh progress animation (indeterminate) để user thấy hệ thống đang hoạt động

#### 2. Nâng cấp Processing UI trong `AddonCheckoutPayment.tsx` (dòng 309-313)
Tương tự CheckoutPayment, thay spinner nhỏ bằng UI processing rõ ràng hơn:
- Spinner + text mô tả đang xác nhận với PayPal
- Cảnh báo không thoát trang
- Hiển thị order code

#### 3. Thêm `beforeunload` event listener
Trong cả 2 file, khi `paymentStatus === 'processing'`, đăng ký `window.addEventListener('beforeunload')` để hiện cảnh báo trình duyệt khi user cố thoát/reload trang.

### Files cần sửa
- `src/pages/CheckoutPayment.tsx`
- `src/pages/AddonCheckoutPayment.tsx`

