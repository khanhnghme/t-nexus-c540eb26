

## Plan: Hiển thị rõ phần giảm giá welcome + gọn UI Step 2

### Vấn đề
- Step 1 & Step 2: Mỗi plan card/row hiển thị giá gốc gạch ngang + giá welcome riêng lẻ → rối mắt
- Step 2: Không hiển thị rõ tổng giá gốc - tổng giảm = tổng thanh toán

### Giải pháp

**File: `src/pages/Checkout.tsx`**

#### Step 1 — Plan cards (line ~322-328)
- Xoá dòng giá gốc gạch ngang riêng trên mỗi card
- Chỉ hiển thị giá welcome (đã giảm) làm giá chính
- Không ghi chi tiết giảm bao nhiêu trên từng card (banner chung đã nói "~20%")

#### Step 1 — Order Summary bên phải (line ~436-448)
- Plan price chỉ hiển thị giá welcome `$baseAmount`
- Nếu `welcomeDiscount > 0`, thêm 1 dòng riêng "🎉 Ưu đãi chào mừng" hiển thị `-$welcomeDiscount` màu emerald (giống dòng coupon)

#### Step 2 — Order Table (line ~552-620)
- Plan row: chỉ hiển thị giá gốc `$originalBaseAmount` (không gạch ngang + giá welcome xen kẽ)
- Bỏ hiển thị giá welcome trên dòng plan
- Phần Subtotal/Discount/Total ở dưới bảng:
  - Tạm tính: `$originalBaseAmount + $addonOriginal` (tổng giá gốc)
  - Dòng "Ưu đãi chào mừng": `-$welcomeDiscount` (nếu có)
  - Dòng "Add-on savings": `-$addonSaving` (nếu có)
  - Dòng "Coupon": `-$discountAmount` (nếu có)
  - Tổng: `$totalAmount`

#### Step 2 — Pay Box bên phải (line ~708-724)
- Plan hiển thị giá gốc `$originalBaseAmount`
- Thêm dòng "Ưu đãi chào mừng" `-$welcomeDiscount` nếu có
- Giữ nguyên dòng Add-ons, Discount

### Tóm tắt logic
- Không ghi chi tiết % giảm trên từng gói
- Tách rõ: giá gốc → các dòng giảm giá → tổng cuối
- UI sạch, dễ hiểu

### Files cần sửa
- `src/pages/Checkout.tsx`

