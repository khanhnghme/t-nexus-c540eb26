

## Plan: Fix 3 lỗi chặn email thanh toán

### Phân tích lỗi từ logs

```text
Lỗi 1 (CHẶN EMAIL):  Resend 422 — Invalid `from` field
Lỗi 2 (CHẶN PDF):    WinAnsi cannot encode "ễ" — font không hỗ trợ tiếng Việt
Lỗi 3 (NON-BLOCKING): R2 NoSuchBucket — bucket "invoices" chưa tạo
```

### Changes

**1. Fix SENDER_EMAIL secret**
- Yêu cầu cập nhật secret `SENDER_EMAIL` với giá trị đúng format: `T-Nexus <noreply@t-nexus.io.vn>`
- Đồng thời domain `t-nexus.io.vn` phải được verify trên Resend dashboard. Nếu chưa verify, tạm dùng `onboarding@resend.dev` để test

**2. Fix PDF tiếng Việt trong `invoice-pdf-builder.ts`**
- Thay toàn bộ text tiếng Việt có dấu bằng text ASCII không dấu hoặc tiếng Anh
- Ví dụ: "Hóa đơn" → "Invoice", "Ngày thanh toán" → "Payment date", v.v.
- pdf-lib với StandardFonts chỉ hỗ trợ WinAnsi encoding (Latin cơ bản), không thể render tiếng Việt có dấu

**3. R2 bucket "invoices" — bỏ qua hoặc tạo bucket**
- Code đã có try/catch non-blocking, email vẫn gửi được dù R2 fail
- Nếu muốn lưu PDF, cần tạo bucket `invoices` trên Cloudflare R2 dashboard
- Hoặc bỏ logic upload R2 nếu không cần lưu trữ PDF riêng (vì đã gửi qua email attachment)

**4. Deploy lại edge function**
- Deploy: `payment-confirmation-email`

### Thứ tự ưu tiên
1. Fix SENDER_EMAIL → email gửi được ngay
2. Fix PDF text → PDF tạo được → đính kèm email
3. R2 bucket → optional, không ảnh hưởng email

