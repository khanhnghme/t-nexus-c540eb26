

## Plan: Nâng cấp Billing History — Chi tiết hơn + Xuất hóa đơn in

### Tổng quan
Hiện tại tab Billing chỉ hiển thị bảng đơn giản (ngày, mã GD, gói, số tiền, trạng thái). Cần nâng cấp:
1. **Fetch đầy đủ dữ liệu** từ `payment_history` (hiện chỉ select 5 cột, bảng có 18 cột)
2. **Click vào dòng → mở dialog chi tiết** (tái sử dụng pattern từ `PaymentDetailDialog` admin)
3. **Nút "Xuất hóa đơn"** trong dialog → tạo invoice PDF có thể in/tải

### Chi tiết kỹ thuật

**1. `src/pages/ServicePlan.tsx` — Billing tab**
- Thay đổi query `payment_history` từ `select('id, transaction_id, created_at, plan_purchased, amount, final_amount, status, payment_method')` → `select('*')` để lấy toàn bộ dữ liệu
- Thêm cột `payment_method` vào bảng
- Mỗi dòng clickable → mở dialog chi tiết
- Thêm RLS policy cho user xem được payment_history của chính mình (hiện chỉ có system_admin select)

**2. `src/components/billing/UserPaymentDetailDialog.tsx` — Dialog chi tiết (mới)**
- Tái sử dụng layout từ `PaymentDetailDialog` admin nhưng bỏ system_note
- Hiển thị: Transaction ID, Order ID, Invoice ID, Plan, Status, Method, Original Amount, Discount, Coupon, Final Amount, Paid At
- Nút **"Print Invoice / Download PDF"** ở cuối dialog

**3. `src/components/billing/InvoiceTemplate.tsx` — Template hóa đơn (mới)**
- Component React dùng cho print: logo, thông tin người mua (từ profile: full_name, email), thông tin GD, bảng chi tiết giá
- Sử dụng `window.print()` với CSS `@media print` để in trực tiếp từ trình duyệt — không cần thư viện PDF bên ngoài
- Layout: Header (logo + "INVOICE") → Buyer/Seller info → Line items table → Total → Footer

**4. Database: Thêm RLS policy**
- Thêm policy cho `payment_history`: Users can view own payment history (`user_id = auth.uid()`)

### Files cần tạo/sửa
- `src/pages/ServicePlan.tsx` — Mở rộng query + clickable rows + dialog state
- `src/components/billing/UserPaymentDetailDialog.tsx` — **Mới** — Dialog chi tiết cho user
- `src/components/billing/InvoiceTemplate.tsx` — **Mới** — Template hóa đơn in
- Migration: Thêm RLS policy cho user đọc payment_history của mình

