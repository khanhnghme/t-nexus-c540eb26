

## Kế hoạch: Fix luồng Onboarding → Checkout không bị xung đột layout

### Vấn đề hiện tại

- `/onboarding` nằm **ngoài** `ProtectedLayout` (không có DashboardLayout)
- `/checkout`, `/checkout/payment/:orderCode`, `/checkout/summary/:orderCode` nằm **trong** `ProtectedLayout` (có DashboardLayout với sidebar, header)
- Khi user onboarding bấm "Nâng cấp" → navigate `/checkout` → bị render bên trong DashboardLayout → chồng layout, vỡ UI

### Giải pháp: Tạo layout wrapper thông minh cho checkout routes

Tách checkout routes ra khỏi `ProtectedLayout`, đặt chúng ở cấp standalone. Tạo một wrapper component `CheckoutLayoutWrapper` tự detect context:

- Nếu `sessionStorage.getItem('checkout_from') === 'onboarding'` → render layout đơn giản (minimal: header nhỏ + nội dung, không sidebar)
- Nếu không → render bên trong `DashboardLayoutProvider` + `DashboardLayout` như cũ

Cách này giữ **1 codebase checkout duy nhất**, chỉ thay đổi shell bao ngoài.

### Thay đổi cụ thể

**1. `src/App.tsx` — Di chuyển checkout routes**

- Tách 4 checkout routes ra khỏi `<Route element={<ProtectedLayout />}>`
- Đặt chúng vào standalone `<Route element={<CheckoutLayoutWrapper />}>`:

```text
// Standalone checkout routes (trước ProtectedLayout)
<Route element={<ProtectedRoute><CheckoutLayoutWrapper /></ProtectedRoute>}>
  <Route path="/checkout" element={<Checkout />} />
  <Route path="/checkout/result" element={<PaymentResult />} />
  <Route path="/checkout/summary/:orderCode" element={<CheckoutSummary />} />
  <Route path="/checkout/payment/:orderCode" element={<CheckoutPayment />} />
  <Route path="/addon-checkout" element={<AddonCheckout />} />
  <Route path="/addon-checkout/:orderCode" element={<AddonCheckoutPayment />} />
</Route>
```

**2. Tạo `src/components/layout/CheckoutLayoutWrapper.tsx`**

- Kiểm tra `sessionStorage.getItem('checkout_from')`
- Nếu `=== 'onboarding'` → render minimal layout (logo + back button + `<Outlet />`)
- Nếu khác → render `<DashboardLayoutProvider><DashboardLayout useOutlet /></DashboardLayoutProvider>` (y hệt ProtectedLayout hiện tại)
- Giữ nguyên trải nghiệm dashboard cho user thường

**3. `src/components/FirstTimeOnboarding.tsx` — Đơn giản hóa**

- Xóa toàn bộ checkout sub-step trong onboarding (step `checkout` khỏi `allSteps`)
- Khi user bấm "Nâng cấp" ở step `plan` → `sessionStorage.setItem('checkout_from', 'onboarding')` + navigate `/checkout?plan=X&cycle=Y&from=onboarding` (đã có sẵn logic này)
- Bỏ `'checkout'` khỏi `StepId` type và `stepIcons`/`stepLabels`/`stepDescriptions`

### Không sửa

- `src/pages/Checkout.tsx` — giữ nguyên
- `src/pages/CheckoutPayment.tsx` — giữ nguyên  
- `src/pages/CheckoutSummary.tsx` — giữ nguyên (đã có logic "Tiếp tục thiết lập")
- Backend — không đổi

### Files cần tạo/sửa

| File | Thay đổi |
|------|----------|
| `src/components/layout/CheckoutLayoutWrapper.tsx` | **Tạo mới** — wrapper detect onboarding vs dashboard |
| `src/App.tsx` | Di chuyển 6 checkout routes ra standalone |
| `src/components/FirstTimeOnboarding.tsx` | Xóa checkout step, giữ redirect |

