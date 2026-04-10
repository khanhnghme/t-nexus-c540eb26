

## Kế hoạch: Thống nhất tất cả luồng thanh toán về chuẩn 3-step

### Phân tích hiện trạng

| Luồng | Hiện tại | Vấn đề |
|-------|----------|--------|
| **Plan checkout** (`/checkout` → `/checkout/payment` → `/checkout/summary`) | ✅ Chuẩn | Không sửa |
| **Addon checkout** (`/addon-checkout` → `/addon-checkout/:orderCode` → `/checkout/summary`) | ⚠️ Gần chuẩn | `AddonCheckout.tsx` còn code cũ dùng `orderID` thay vì `subscriptionID`, navigate đến `/checkout/result` — dead code nhưng cần dọn |
| **Onboarding** (`FirstTimeOnboarding.tsx`) | ❌ Lệch chuẩn | Có PayPal buttons nhúng trực tiếp trong component, tự xử lý capture/polling riêng, không dùng route `/checkout/*` |

### Thay đổi cần thực hiện

**1. `src/components/FirstTimeOnboarding.tsx` — Loại bỏ PayPal inline, redirect sang `/checkout`**

- Xóa toàn bộ checkout sub-step 2 (PayPal buttons, `createSubscription`, `onApprove`, payment processing UI)
- Giữ checkout sub-step 1 (chọn cycle, addons, coupon) làm bước cấu hình
- Khi user bấm "Tiếp tục thanh toán" ở sub-step 1 → redirect sang `/checkout?plan=X&cycle=Y&addons=...&coupon=...&from=onboarding`
- Xóa import `PayPalScriptProvider`, `PayPalButtons`
- Giữ step "plan" (chọn gói) và step "finish" nguyên vẹn
- Khi quay về từ `/checkout/summary` thành công → `/onboarding` sẽ detect profile đã có plan mới → bỏ qua plan/checkout steps, nhảy thẳng finish

**2. `src/pages/Checkout.tsx` — Hỗ trợ query params từ onboarding**

- Đọc query params `from=onboarding`, `plan`, `cycle`, `addons`, `coupon` để pre-fill form
- Sau khi hoàn tất checkout summary → nếu `from=onboarding`, redirect về `/onboarding` thay vì `/dashboard`

**3. `src/pages/CheckoutSummary.tsx` — Hỗ trợ redirect về onboarding**

- Nếu detect `from=onboarding` (qua query param hoặc sessionStorage) → nút "Về Dashboard" đổi thành "Tiếp tục thiết lập" → navigate `/onboarding`

**4. `src/pages/AddonCheckout.tsx` — Dọn dead code**

- Xóa `createOrder` và `captureOrder` callbacks (dead code từ khi tách Step 2 sang `AddonCheckoutPayment.tsx`)
- Xóa import `PayPalScriptProvider`, `PayPalButtons` (không còn dùng)
- Giữ nguyên Step 1 UI và `createReservation` logic

### Không sửa (giữ nguyên)

- `src/pages/CheckoutPayment.tsx`
- `src/pages/AddonCheckoutPayment.tsx`  
- `src/pages/CheckoutSummary.tsx` (chỉ thêm logic redirect onboarding nhỏ)
- `supabase/functions/*` (backend không đổi)

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/FirstTimeOnboarding.tsx` | Xóa PayPal inline, redirect sang `/checkout` |
| `src/pages/Checkout.tsx` | Đọc query params onboarding để pre-fill |
| `src/pages/CheckoutSummary.tsx` | Thêm nút redirect về onboarding |
| `src/pages/AddonCheckout.tsx` | Dọn dead code PayPal |

