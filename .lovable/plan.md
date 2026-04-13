

## Plan: Fix hiển thị tạm tính & giảm giá trên hóa đơn

### Vấn đề
Dòng "Tạm tính" (Subtotal) đang hiển thị giá đã trừ giảm giá, thay vì hiển thị giá gốc rồi trừ riêng dòng giảm giá phía dưới. Cần đảm bảo logic nhất quán ở **3 nơi**: trang Summary web, bản in (PrintableInvoice), và PDF đính kèm email.

### Nguyên nhân
Trong bảng `orders`:
- `base_amount` = giá gốc plan
- `addon_amount` = giá addon
- `discount_amount` = tổng giảm (coupon + welcome + addon saving) — đã gộp cả welcome_discount
- `welcome_discount` = riêng phần welcome

Khi hiển thị, nếu show cả `discount_amount` VÀ `welcome_discount` riêng → bị trùng (double count). Cần tách rõ: chỉ hiện discount_amount đã trừ welcome_discount (= coupon + addon saving), hoặc gộp thành 1 dòng "Giảm giá" duy nhất.

### Giải pháp

Thống nhất logic ở cả 3 nơi:

1. **Subtotal** = `base_amount + addon_amount` (giá gốc, KHÔNG trừ gì)
2. **Dòng "Giảm giá coupon"** = chỉ hiện phần coupon: `discount_amount - welcome_discount` (nếu > 0)
3. **Dòng "Ưu đãi chào mừng"** = `welcome_discount` (nếu > 0)
4. **TỔNG CỘNG** = `total_amount`

Kiểm tra: `base_amount + addon_amount - (discount_amount) = total_amount` (vì discount_amount đã gộp tất cả)

### Files thay đổi

1. **`src/pages/CheckoutSummary.tsx`**
   - PrintableInvoice: sửa dòng coupon discount hiển thị `discount_amount - welcome_discount` thay vì `discount_amount`
   - Section "Order Breakdown" (card): tương tự
   
2. **`supabase/functions/_shared/invoice-pdf-builder.ts`**
   - Tương tự: dòng discount chỉ hiện `discount_amount - welcome_discount`

3. **`src/components/billing/InvoiceTemplate.tsx`**
   - Thêm dòng welcome_discount nếu có
   - Đảm bảo `originalAmount` hiển thị giá gốc, discount tách riêng

4. **Deploy** edge function `payment-confirmation-email`

