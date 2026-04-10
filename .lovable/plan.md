

## Plan: Nâng cấp toàn bộ UI Step 3 (Summary)

### Tổng quan
Viết lại hoàn toàn `CheckoutSummary.tsx` với layout rộng hơn, chia thành các section rõ ràng, hiển thị đầy đủ thông tin giao dịch và responsive.

### Thay đổi — `src/pages/CheckoutSummary.tsx`

Thay thế toàn bộ nội dung bằng layout mới:

#### Layout tổng thể
- `max-w-2xl` thay vì `max-w-lg` → tận dụng không gian
- Step Progress bar vẫn giữ ở trên
- Responsive: 1 cột trên mobile, grid 2 cột trên desktop cho phần thông tin

#### Section 1: Status Header (full width)
- Icon lớn + animation ping cho success
- Tiêu đề trạng thái (font lớn, bold)
- Mô tả ngắn
- Badge trạng thái + Mã đơn hàng (`order_code`) hiển thị nổi bật bằng `font-mono`

#### Section 2: Grid 2 cột (desktop) — Thông tin thời gian + Thanh toán

**Card trái — Thông tin thời gian:**
- Thời gian tạo đơn (`created_at`)
- Thời gian thanh toán (`completed_at`) — chỉ hiện khi success
- Thời gian kết thúc (cancelled/expired) — tùy status

**Card phải — Thông tin thanh toán:**
- Phương thức thanh toán (`payment_method` — hiện "PayPal")
- Transaction ID (`paypal_order_id`) — nếu có
- Trạng thái đơn hàng (badge)

#### Section 3: Bảng tóm tắt chi phí (full width Card)
- Plan + billing cycle
- Giá gốc (base_amount)
- Add-ons: parse `addons` JSON, hiển thị từng item với giá
- Giảm giá (discount + coupon code nếu có)
- Welcome discount nếu > 0
- Separator
- **Tổng tiền** (font lớn, bold)

#### Section 4: Actions (full width)
- **Success:**
  - "Tải hóa đơn" (Printer icon) — `window.print()` cho MVP
  - "Đi đến Dashboard" (Home icon)
- **Failed:**
  - "Thanh toán lại" → navigate to payment
  - "Lịch sử thanh toán"
- **Cancelled / Expired:**
  - "Tạo đơn mới"
  - "Lịch sử thanh toán"

### Chi tiết kỹ thuật

- Sử dụng `ADDON_TYPES` mapping để hiển thị tên addon dễ đọc
- Parse `order.addons` (jsonb array) để liệt kê từng addon item
- `window.print()` cho nút in hóa đơn (đơn giản, hiệu quả)
- Giữ nguyên logic fetch bằng `order_code`, redirect pending → payment
- Responsive grid: `grid-cols-1 md:grid-cols-2`

### Files

| File | Action |
|---|---|
| `src/pages/CheckoutSummary.tsx` | Rewrite — layout mới, đầy đủ thông tin |

