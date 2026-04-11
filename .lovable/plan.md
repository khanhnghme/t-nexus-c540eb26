

## Chuẩn hóa route addon-checkout theo chuẩn checkout + fix lỗi Back & popup

### Vấn đề hiện tại

1. **Route không chuẩn**: Addon checkout dùng `/addon-checkout/:orderCode` thay vì `/addon-checkout/payment/:orderCode`. Summary addon vẫn dùng chung `/checkout/summary/:orderCode`.
2. **Nút Back không hoạt động**: `isPaymentPage` check sai pattern (`/addon-checkout/payment` — route không tồn tại), nên nút Back luôn navigate thẳng thay vì show dialog.
3. **Popup Leave bị lỗi**: Do `isPaymentPage` luôn false cho addon routes.

### Thay đổi

**1. Route — `src/App.tsx`**

Đổi route addon từ:
```
/addon-checkout/:orderCode → /addon-checkout/payment/:orderCode
```
Thêm route summary riêng cho addon:
```
/addon-checkout/summary/:orderCode → CheckoutSummary (reuse)
```

**2. Navigation updates — 5 files**

| File | Thay đổi |
|------|----------|
| `AddonCheckout.tsx` | `navigate('/addon-checkout/' + code)` → `navigate('/addon-checkout/payment/' + code)` |
| `AddonCheckoutPayment.tsx` | Tất cả `navigate('/addon-checkout')` giữ nguyên. Tất cả `navigate('/checkout/summary/' + code)` → `navigate('/addon-checkout/summary/' + code)`. Cập nhật `useParams` route match. |
| `CheckoutSummary.tsx` | Redirect pending addon: `/addon-checkout/${code}` → `/addon-checkout/payment/${code}` |
| `BillingHistory.tsx` | Navigate addon payment: `/addon-checkout/${code}` → `/addon-checkout/payment/${code}`. Navigate addon summary tương tự. |
| `ServicePlan.tsx` | Nếu có navigate trực tiếp đến `/addon-checkout/:orderCode`, cập nhật. |

**3. Fix Back & popup — `CheckoutLayoutWrapper.tsx`**

Fix `isPaymentPage` detection:
```typescript
const isPaymentPage = 
  location.pathname.startsWith('/checkout/payment') || 
  location.pathname.startsWith('/addon-checkout/payment');
```
Giờ pattern khớp đúng vì route mới là `/addon-checkout/payment/:orderCode`.

Fix `handleConfirmBack`: khi ở addon payment và từ onboarding → navigate `/onboarding`.

**4. Ẩn Back button trùng — `AddonCheckoutPayment.tsx`**

Khi `checkout_from === 'onboarding'`, ẩn nút Back riêng trong page (vì header đã có).

### Kết quả

- Routes addon tuân thủ chuẩn 3 bước: `/addon-checkout` → `/addon-checkout/payment/:orderCode` → `/addon-checkout/summary/:orderCode`
- Nút Back hoạt động đúng, popup Leave hiện đúng tại trang payment
- Không còn duplicate back button

