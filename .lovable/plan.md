

## Giai đoạn 2: Frontend — Chuyển PayPal Buttons sang Subscriptions API

### Tổng quan

Backend đã trả về `subscriptionID` thay vì `orderID`, nhưng frontend vẫn dùng `createOrder` prop và đọc `data.orderID`. Cần cập nhật 5 file để khớp với Subscriptions API.

### Thay đổi cụ thể cho mỗi file

**Thay đổi chung áp dụng cho tất cả 5 file:**

```tsx
// TRƯỚC:
<PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
  <PayPalButtons
    createOrder={async () => createOrder()}
    onApprove={async (data) => onApprove(data)}
  />

// SAU:
<PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD', vault: true, intent: 'subscription' }}>
  <PayPalButtons
    createSubscription={async (data, actions) => { return await createSubscription(); }}
    onApprove={async (data) => onApprove(data)}
  />
```

---

### 1. `src/pages/CheckoutPayment.tsx`
- Đổi `createOrder` callback → `createSubscription`: gọi `create-paypal-order`, đọc `res.data.subscriptionID` thay vì `res.data.orderID`
- Đổi `onApprove`: gửi `subscriptionID: data.subscriptionID` thay vì `orderID: data.orderID` đến `capture-paypal-order`
- `PayPalScriptProvider` thêm `vault: true, intent: 'subscription'`
- `PayPalButtons`: `createOrder` → `createSubscription`

### 2. `src/pages/AddonCheckoutPayment.tsx`
- Tương tự: đổi `createOrder` → `createSubscription`, `captureOrder(data.orderID)` → `captureOrder(data.subscriptionID)`
- `PayPalScriptProvider` thêm `vault: true, intent: 'subscription'`

### 3. `src/pages/Checkout.tsx`
- Đổi `createOrder` callback và `onApprove` callback tương tự
- `PayPalScriptProvider` thêm `vault: true, intent: 'subscription'`
- File này chứa PayPal buttons nhưng step 2 đã tách sang route riêng — chỉ cần đổi nếu còn PayPal logic

### 4. `src/pages/AddonCheckout.tsx`
- Không có PayPal buttons trực tiếp (step 2 đã tách) — không cần thay đổi

### 5. `src/components/FirstTimeOnboarding.tsx`
- Đổi `createOrder` → `createSubscription`: đọc `res.data.subscriptionID`
- Đổi `onApprove`: gửi `subscriptionID: data.subscriptionID` đến `capture-paypal-order`
- `PayPalScriptProvider` thêm `vault: true, intent: 'subscription'`

---

### Chi tiết kỹ thuật

Mỗi file cần 3 thay đổi:

1. **PayPalScriptProvider options**: thêm `vault: true, intent: 'subscription'`
2. **createOrder → createSubscription**: callback trả về `subscriptionID` từ edge function
3. **onApprove handler**: đọc `data.subscriptionID` thay vì `data.orderID`, gửi đến capture endpoint

Background polling giữ nguyên (poll order status từ DB). UI không thay đổi.

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/pages/CheckoutPayment.tsx` | 3 thay đổi: provider options, createSubscription, onApprove |
| `src/pages/AddonCheckoutPayment.tsx` | 3 thay đổi tương tự |
| `src/pages/Checkout.tsx` | Kiểm tra — nếu còn PayPal buttons thì đổi |
| `src/components/FirstTimeOnboarding.tsx` | 3 thay đổi tương tự |

