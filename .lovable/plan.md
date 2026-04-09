

## Plan: Redesign hiển thị giảm giá 2 step theo mockup

### Phân tích từ ảnh tham chiếu

**Step 1 — Order Summary (phải):**
- Plan price hiển thị giá GỐC ($240.00)
- Dòng riêng "🎉 Ưu đãi chào mừng" → -$21.00 (emerald)
- Addon items hiển thị giá đã giảm × qty
- Dòng riêng "Tiết kiệm add-on" → -$149.40 (emerald)
- Tổng cộng bold lớn
- Ghi chú "Thanh toán một lần mỗi năm"

**Step 2 — Order Table:**
- Plan row: giá gốc, không gạch ngang inline
- Addon rows: giá gốc gạch ngang + giá đã giảm emerald (cùng dòng)
- Breakdown dưới bảng: Tạm tính → Welcome → Tiết kiệm add-on (%) → Tổng cộng
- Pay Box phải: Tổng thanh toán lớn, rồi liệt kê Plan / Welcome / Addons / Tiết kiệm

### So sánh với code hiện tại → cần sửa

1. **Step 1 Order Summary**: Hiện tại addon items hiển thị giá đã giảm nhưng KHÔNG có giá gốc gạch ngang → thêm giá gốc gạch ngang khi có discount (giống addon section bên trái)
2. **Step 2 Pay Box**: Hiện tại show `addonFinal` cho Add-ons → đổi thành show `addonOriginal` (tổng addon gốc) rồi dòng riêng Tiết kiệm add-on trừ ra — giống mockup
3. **Step 2 Order Table addon rows**: Đã đúng (gạch ngang + emerald)
4. **Step 2 Subtotal**: Đã đúng nhưng cần đảm bảo format giống mockup — "Tiết kiệm add-on (20%)" text

### Thay đổi cụ thể

**File: `src/pages/Checkout.tsx`**

**Step 1 — Order Summary addon items (line ~460-471):**
- Thêm giá gốc gạch ngang trước giá đã giảm khi `addonDiscountRate > 0`
- Format: `$24.90` ~~gạch~~ `$19.92` (giống mockup)

**Step 2 — Pay Box (line ~732-736):**
- Thay `addonFinal` bằng `addonOriginal` cho dòng "Add-ons" 
- Đảm bảo dòng "Tiết kiệm add-on" hiển thị đúng bên dưới

**Cleanup nhỏ:**
- Đảm bảo format text nhất quán giữa 2 step

### Files cần sửa
- `src/pages/Checkout.tsx`

