

## Plan: Email xác nhận thanh toán với biên lai PDF đính kèm

### Tóm tắt
Hệ thống tự động gửi email xác nhận khi thanh toán thành công, đính kèm biên lai PDF được tạo server-side bằng jsPDF. PDF được lưu vào Storage bucket `invoices` và đính kèm vào email qua Resend API.

### Đã triển khai

**1. Migration: `payment_email_sent` + Storage bucket `invoices`**
- Cột `payment_email_sent` (boolean) trên bảng `orders` — chống gửi email trùng
- Bucket `invoices` (private) — lưu trữ PDF biên lai

**2. `supabase/functions/_shared/email-html-builder.ts`**
- Thêm `buildPaymentConfirmationEmail()` — email thông báo ngắn gọn, chuyên nghiệp

**3. `supabase/functions/_shared/invoice-pdf-builder.ts`** (MỚI)
- `buildInvoicePdf()` — tạo PDF biên lai bằng jsPDF, layout giống PrintableInvoice

**4. `supabase/functions/payment-confirmation-email/index.ts`** (MỚI)
- Tạo PDF → Lưu Storage → Đính kèm email → Gửi qua Resend
- Idempotency flag `payment_email_sent`

**5. `capture-paypal-order` + `paypal-webhook`** (CẬP NHẬT)
- Fire-and-forget trigger sau khi order completed

### Flow
```text
Payment success → capture/webhook → order completed
                                    ↓ (fire-and-forget)
                          payment-confirmation-email
                                    ↓
                          Check payment_email_sent flag
                          If false → generate PDF (jsPDF)
                                   → save to Storage (invoices bucket)
                                   → send email via Resend (PDF attached)
                                   → set flag true
                          If true → skip
```
