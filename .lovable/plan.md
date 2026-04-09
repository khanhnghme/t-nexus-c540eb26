

## Plan: Chuyển mua Add-on thành 2-step checkout riêng biệt

### Vấn đề
Hiện tại tab Add-on trên ServicePlan có cả chọn số lượng + hiển thị giá + nút "Proceed to Payment" → navigate sang AddonCheckout. Nhưng user muốn flow giống hệt trang Checkout plan: **trang Add-on chỉ có nút "Mua thêm Add-on"** → nhảy sang **trang checkout 2 step** (Step 1: chọn số lượng + xem giá, Step 2: xác nhận + PayPal).

### Giải pháp

**1. `src/pages/ServicePlan.tsx` — Tab Add-on**
- Giữ phần "Current Add-ons" (tổng quan hiện có) như cũ
- **Xoá** toàn bộ phần "Purchase More" (cards +/- chọn số lượng, purchase summary, nút navigate)
- Thay bằng **1 nút đơn giản**: "Mua thêm gói bổ sung" → navigate `/addon-checkout`
- Nút này nổi bật, có icon Package

**2. `src/pages/AddonCheckout.tsx` — Chuyển thành 2-step**
- **Step 1**: Chọn số lượng add-on (3 cards +/- giống hiện tại ở ServicePlan) + Order Summary bên phải (giá gốc, tiết kiệm, tổng) + nút "Tiếp tục"
- **Step 2**: Bảng xác nhận đơn hàng (read-only) + PayPal buttons + secure badge
- Layout 2 cột giống Checkout.tsx (trái: nội dung chính, phải: tóm tắt đơn hàng)
- Step indicator trên cùng (Step 1 / Step 2)

### Files cần sửa
- `src/pages/ServicePlan.tsx` — Đơn giản hoá tab addon, chỉ giữ overview + nút mua
- `src/pages/AddonCheckout.tsx` — Redesign thành 2-step layout (tham khảo Checkout.tsx)

