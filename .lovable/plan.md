

## Fix: Back button, PayPal glow, và popup xác nhận cho addon checkout

### Vấn đề từ screenshot và mô tả

1. **Back button không hoạt động**: Trong `CheckoutLayoutWrapper` (onboarding layout), nút "Quay lại" trong dialog luôn navigate về `/onboarding` — nhưng với dashboard flow thì `CheckoutPayment.tsx` dùng `navigate(-1)` là đúng. Vấn đề: khi không phải onboarding, nút Back trong `CheckoutPayment` gọi `navigate(-1)` nhưng có thể history stack rỗng.

2. **PayPal buttons phát sáng qua dialog**: Trong `AddonCheckoutPayment.tsx` chưa có class `invisible` khi dialog mở — PayPal iframe xuyên qua overlay.

3. **Addon checkout thiếu popup xác nhận back**: `AddonCheckoutPayment.tsx` không có `showBackDialog` + countdown logic.

### Thay đổi cụ thể

**1. `src/pages/CheckoutPayment.tsx`**
- Fix nút "Quay lại" trong back dialog: thay `navigate(-1)` bằng `navigate('/checkout', { replace: true })` (quay về step 1) cho dashboard flow, hoặc nếu từ onboarding thì không cần vì layout đã xử lý.

**2. `src/pages/AddonCheckoutPayment.tsx`**
- Thêm state `showBackDialog`, `backDialogTimeLeft`
- Thêm `useEffect` countdown timer (copy logic từ CheckoutPayment)
- Thêm nút Back ở đầu trang (trước header)
- Thêm Back Confirmation Dialog (giống CheckoutPayment)
- Wrap PayPal buttons với `invisible` class khi `showBackDialog || showCancelDialog` đang mở
- Nút "Quay lại" trong dialog → `navigate('/addon-checkout')` (quay về step 1 addon)

**3. `src/components/layout/CheckoutLayoutWrapper.tsx`**
- Fix `isPaymentPage` check: thêm detect `/addon-checkout/` routes (hiện chỉ check `/checkout/payment`)
- Nút "Quay lại" trong dialog: navigate phù hợp theo route (onboarding vs addon)

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/pages/CheckoutPayment.tsx` | Fix navigate trong back dialog |
| `src/pages/AddonCheckoutPayment.tsx` | Thêm back button + confirmation dialog + invisible PayPal |
| `src/components/layout/CheckoutLayoutWrapper.tsx` | Detect addon routes + fix navigation |

