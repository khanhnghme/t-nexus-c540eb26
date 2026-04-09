

## Plan: Áp dụng layout 2 bước cho trang Checkout trong Onboarding

### Vấn đề
Trang Checkout chính (`/checkout`) có 2 bước rõ ràng:
- **Bước 1**: Cấu hình (chu kỳ, add-ons, coupon) + Order Summary bên phải → nút "Tiếp tục thanh toán"
- **Bước 2**: Bảng Order Summary chi tiết ở trên + Payment Method (trái) + Pay Box (phải)

Nhưng Checkout trong Onboarding hiện tại gộp tất cả vào 1 màn hình duy nhất — không có phân bước.

### Giải pháp

Thêm state `checkoutStep` (1 hoặc 2) trong `FirstTimeOnboarding.tsx`. Khi `currentStep === 'checkout'`:

**checkoutStep = 1**: Giống Checkout.tsx step 1
- Cột trái (3/5): Billing Cycle + Add-ons + Coupon
- Cột phải (2/5): Order Summary (sticky)
- Thanh CTA dưới cùng: Tổng + nút "Thanh toán" → chuyển sang checkoutStep 2

**checkoutStep = 2**: Giống Checkout.tsx step 2
- Trên: Bảng Order Summary dạng table (Item / Price / Qty / Total)
- Dưới 2 cột: Payment Method trái (3/5) + Pay Box phải (2/5) với tổng tiền + PayPal buttons
- Nút quay lại → checkoutStep = 1

Nút "Back" ở sidebar/header:
- Nếu checkoutStep = 2 → về checkoutStep = 1
- Nếu checkoutStep = 1 → về bước Plan

### Files cần sửa
- `src/components/FirstTimeOnboarding.tsx` — refactor checkout section thành 2 sub-steps

