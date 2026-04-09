

## Plan: Chi tiết hóa gói dịch vụ + Tích hợp Checkout trực tiếp trong Onboarding

### Vấn đề
- Bước "Plan" trong onboarding chỉ hiển thị 3 dòng feature ngắn gọn cho mỗi gói, trong khi Pricing page có 7-11 feature chi tiết
- Khi chọn gói trả phí, user bị redirect ra `/checkout` rồi quay lại — không mượt

### Giải pháp

#### 1. Chi tiết hóa bước Plan
Thay 3 feature ngắn (`planFreeF1/F2/F3`) bằng danh sách đầy đủ lấy từ `pricing.plans.{plan}.features` (cùng source với trang Pricing). Card mỗi gói sẽ cao hơn, scrollable, hiển thị mô tả gói + toàn bộ feature list.

#### 2. Thêm bước `checkout` vào onboarding flow
Thay vì redirect sang `/checkout`, thêm step mới `'checkout'` ngay sau `'plan'`:

```text
language → welcome → [password] → info → plan → [checkout] → finish
```

- Bước `checkout` chỉ xuất hiện khi chọn gói trả phí
- Tích hợp toàn bộ UI checkout (chọn chu kỳ, add-ons, coupon, PayPal) trực tiếp trong FirstTimeOnboarding
- Thanh toán thành công → tự động chuyển sang bước Finish
- Cancel/quay lại → về bước Plan

#### 3. Xoá logic redirect cũ
- Xoá `handlePlanContinue` redirect đến `/checkout`
- Xoá `saveProfileTemp` (không cần save tạm nữa vì user ở cùng 1 trang)
- Xoá xử lý `from=checkout_success` URL param
- Xoá logic redirect trong `Checkout.tsx` liên quan `from=onboarding`

### Thay đổi chi tiết

**`src/components/FirstTimeOnboarding.tsx`**:
- Thêm `'checkout'` vào `StepId`, chỉ thêm vào `allSteps` khi `selectedPlan !== 'plan_free'`
- Import `PayPalScriptProvider`, `PayPalButtons` từ `@paypal/react-paypal-js`
- Import `PLAN_CONFIG` từ `planConfig.ts`
- Thêm state: `cycle`, `addons`, `couponCode`, `couponDiscount`, `paypalClientId`, `paymentStatus`
- Bước Plan: hiển thị features đầy đủ từ `pricing.plans` translations
- Bước Checkout: render UI checkout (cycle toggle, add-ons, coupon, order summary, PayPal buttons) — tái sử dụng logic tính giá từ Checkout.tsx
- `handlePlanContinue`: nếu free → goNext (finish), nếu trả phí → goNext (checkout)
- PayPal `onApprove` success → auto goNext (finish)

**`src/lib/i18n/en.ts` + `vi.ts`**:
- Thêm translation key `stepCheckout`, `stepCheckoutDesc` cho sidebar
- Xoá các key `planFreeF1/F2/F3`, `planPlusF1/F2/F3`... (thay bằng `pricing.plans.*.features`)

**`src/pages/Checkout.tsx`**:
- Xoá logic `from=onboarding` redirect

### Files cần sửa
- `src/components/FirstTimeOnboarding.tsx` (refactor lớn — thêm checkout step inline)
- `src/lib/i18n/en.ts` (thêm checkout step labels)
- `src/lib/i18n/vi.ts` (thêm checkout step labels)
- `src/pages/Checkout.tsx` (xoá onboarding redirect logic)

