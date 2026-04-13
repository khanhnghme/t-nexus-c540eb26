

## Plan: Email xác nhận thanh toán với biên lai đính kèm (HTML)

### Tóm tắt
Hệ thống hiện tại gửi email qua **Resend API trực tiếp** (không phải Lovable Email). Resend API **có hỗ trợ đính kèm file** — vì vậy hoàn toàn có thể đính kèm biên lai vào email.

Cách tiếp cận: Tạo biên lai dưới dạng **HTML file** (`.html`) server-side trong Edge Function, rồi đính kèm vào email qua Resend API.

### Tại sao HTML thay vì PDF?
- Edge Function (Deno) không có công cụ native để tạo PDF
- HTML file mở được trên mọi trình duyệt, dễ in ra PDF
- Nội dung biên lai giống 100% với trang summary trên web

### Changes

**1. Migration: Thêm cột `payment_email_sent` vào bảng `orders`**
```sql
ALTER TABLE orders ADD COLUMN payment_email_sent boolean DEFAULT false;
```
- Flag chống gửi email trùng lặp

**2. `supabase/functions/_shared/email-html-builder.ts`** (CẬP NHẬT)
- Thêm function `buildPaymentConfirmationEmail(params)` — email thông báo ngắn gọn
- Thêm function `buildInvoiceHtml(params)` — biên lai HTML đầy đủ (standalone, inline CSS, có logo base64, chữ ký điện tử, bảng chi tiết) — tái sử dụng layout từ `PrintableInvoice` component

**3. `supabase/functions/payment-confirmation-email/index.ts`** (MỚI)
- Nhận `orderId`, `userId` từ body
- Query order + profile bằng service role
- Check `payment_email_sent` flag → skip nếu đã gửi
- Build email HTML + build invoice HTML attachment
- Gửi qua Resend API với `attachments` field:
  ```typescript
  await fetch(`${RESEND_API_URL}/emails`, {
    body: JSON.stringify({
      from: 'T-Nexus <noreply@t-nexus.io.vn>',
      to: [userEmail],
      subject: 'Xác nhận thanh toán — T-Nexus',
      html: emailBody,
      attachments: [{
        filename: `Invoice-${orderCode}.html`,
        content: btoa(invoiceHtml),  // base64 encoded
      }],
    }),
  });
  ```
- Update `payment_email_sent = true`
- Log lỗi nếu thất bại

**4. `supabase/functions/capture-paypal-order/index.ts`** (CẬP NHẬT)
- Sau order completed → gọi `payment-confirmation-email` (fire-and-forget)

**5. `supabase/functions/paypal-webhook/index.ts`** (CẬP NHẬT)
- Sau BILLING.SUBSCRIPTION.ACTIVATED → gọi `payment-confirmation-email` (fire-and-forget)

**6. `supabase/config.toml`** (CẬP NHẬT)
- Thêm `[functions.payment-confirmation-email]` với `verify_jwt = false`

### Flow
```text
Payment success → capture/webhook → invoke payment-confirmation-email
                                      ↓
                            Check payment_email_sent flag
                            If false → build email + invoice HTML
                                     → send via Resend (with attachment)
                                     → set flag true
                            If true → skip
```

### Nội dung email
- **Email body**: Xác nhận thanh toán thành công + tóm tắt (gói, số tiền, mã đơn, thời gian)
- **File đính kèm**: `Invoice-ORD-XXXXXX.html` — biên lai đầy đủ có thể mở trên trình duyệt và in

