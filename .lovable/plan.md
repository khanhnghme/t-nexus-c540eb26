

## Plan: Fix & hoàn thiện hệ thống email xác nhận thanh toán

### Đánh giá hiện trạng

Đã hoàn thành:
- ✅ Edge Function `payment-confirmation-email` — đầy đủ logic
- ✅ PDF invoice builder (`invoice-pdf-builder.ts`) — layout chuyên nghiệp
- ✅ Email template (`buildPaymentConfirmationEmail`) — gọn, rõ ràng
- ✅ R2 upload lưu trữ PDF
- ✅ Resend API gửi email với PDF đính kèm
- ✅ Cột `payment_email_sent` (idempotency) — đã có trong DB
- ✅ Log thành công/thất bại vào `email_send_log`
- ✅ Trigger từ `capture-paypal-order` (2 chỗ: addon + plan)
- ✅ Trigger từ `paypal-webhook` (2 chỗ)
- ✅ `config.toml` — `verify_jwt = false`

### Vấn đề cần fix

**1. Edge Function chưa được deploy**
- Logs trống → function chưa bao giờ chạy hoặc chưa deploy phiên bản mới nhất
- Cần deploy lại: `payment-confirmation-email`, `capture-paypal-order`, `paypal-webhook`

**2. jsPDF có thể không hoạt động trong Deno Edge Function**
- `jsPDF` là thư viện browser-oriented, import qua `esm.sh` có thể gặp lỗi runtime do thiếu `window`/`document` trong Deno
- Cần thêm polyfill hoặc chuyển sang thư viện PDF tương thích Deno (ví dụ: `pdf-lib`)
- `pdf-lib` là thư viện pure JavaScript, chạy tốt trên mọi runtime (Deno, Node, browser)

**3. Thiếu error handling cho PDF generation failure**
- Nếu `buildInvoicePdf()` throw error, toàn bộ function fail → email không gửi được
- Cần wrap PDF generation trong try/catch — nếu PDF lỗi thì vẫn gửi email (không đính kèm)

### Changes

**1. Viết lại `invoice-pdf-builder.ts` dùng `pdf-lib`**
- Thay `jsPDF` bằng `pdf-lib` (import từ `https://esm.sh/pdf-lib@1.17.1`)
- Giữ nguyên layout và nội dung hiện tại
- `pdf-lib` chạy native trên Deno, không cần DOM

**2. Cập nhật `payment-confirmation-email/index.ts`**
- Wrap `buildInvoicePdf()` trong try/catch
- Nếu PDF fail → vẫn gửi email không đính kèm + log warning
- Đảm bảo email luôn được gửi dù PDF có lỗi

**3. Deploy tất cả Edge Functions liên quan**
- Deploy: `payment-confirmation-email`, `capture-paypal-order`, `paypal-webhook`

