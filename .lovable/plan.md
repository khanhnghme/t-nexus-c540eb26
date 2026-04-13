

## Plan: Fix PDF invoice & Redesign email thanh toán

### Vấn đề hiện tại
1. **PDF invoice** thiếu logo T-Nexus text (logo fetch có thể fail hoặc vị trí sai so với trang Summary)
2. **Email thanh toán** quá phức tạp — cần đơn giản hóa, responsive tốt hơn trên mobile/laptop

### Các thay đổi

**1. Fix PDF Invoice (`supabase/functions/_shared/invoice-pdf-builder.ts`)**
- Đồng bộ layout PDF với trang CheckoutSummary: header có logo T-Nexus text bên phải, "HÓA ĐƠN" bên trái
- Fix vị trí logo: đảm bảo logo hiển thị đúng vị trí (hiện tại `y + 4` có thể bị lệch so với header text)
- Thêm fallback robust hơn: nếu logo PNG fetch fail, thử embed base64 trực tiếp thay vì chỉ vẽ text

**2. Redesign Email thanh toán (`supabase/functions/_shared/email-html-builder.ts`)**
- Viết lại `buildPaymentConfirmationEmail()` đơn giản hơn:
  - Bỏ icon success tròn (✓ circle) — thay bằng text đơn giản
  - Bảng thông tin đơn giản hóa: mỗi dòng 1 cặp label-value, không chia 2 cột (responsive tốt hơn trên mobile)
  - Tổng thanh toán nổi bật nhưng clean
  - Giữ note đính kèm PDF
  - Responsive: trên mobile padding giảm, font size phù hợp
- Đảm bảo `max-width: 540px` và mobile media query hoạt động tốt

**3. Deploy lại edge functions**
- Deploy: `payment-confirmation-email`
- Test bằng curl với order thật để verify email + PDF

### Chi tiết kỹ thuật

**PDF fix**: Điều chỉnh tọa độ logo — đặt logo ở `y` cùng hàng với "HÓA ĐƠN", tính `logoDisplayH` chính xác từ aspect ratio

**Email redesign**: Layout mới dạng single-column stacked rows:
```
[Logo]                    [Subtitle]
─────────────────────────────────
Thanh toán thành công!
Xin chào [name], giao dịch đã xác nhận.

Gói dịch vụ:    Plus Plan
Chu kỳ:         Năm
Mã đơn hàng:    ORD-...
Thời gian:      13/04/2026
─────────────────────────────────
Tổng:           $XX.XX USD
─────────────────────────────────
📎 File PDF đính kèm
─────────────────────────────────
[Footer]
```

Mỗi row là `<tr>` riêng biệt — không dùng 2-column layout → responsive tự nhiên trên mọi thiết bị.

