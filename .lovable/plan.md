

## Plan: Email & PDF Invoice song ngữ (EN/VI) theo setting người dùng

### Tổng quan
Tất cả email hệ thống (OTP đăng ký, OTP quên mật khẩu, xác nhận thanh toán, digest) và PDF invoice sẽ hiển thị nội dung **tiếng Anh hoặc tiếng Việt** tùy theo `profiles.preferred_locale` của người dùng.

### Các thay đổi

**1. Tạo file i18n cho email (`supabase/functions/_shared/email-i18n.ts`)**
- Map tất cả text string theo locale `vi` / `en`
- Bao gồm: OTP email (title, subtitle, expiry, warning, ignore), payment email (labels, subject), digest email, PDF invoice (labels, notes, footer)
- Export hàm `getEmailTexts(locale: 'vi' | 'en')` trả về object chứa tất cả text

**2. Cập nhật `email-html-builder.ts`**
- Các hàm `buildBrandedOtpEmail`, `buildPaymentConfirmationEmail`, `buildBrandedDigestEmail` nhận thêm param `locale?: 'vi' | 'en'` (default `'vi'`)
- Dùng `getEmailTexts(locale)` để lấy text thay vì hardcode tiếng Việt
- `emailDoctype()` cập nhật `lang` attribute theo locale
- `emailFooter()`, `emailSubFooter()` cũng theo locale

**3. Cập nhật `invoice-pdf-builder.ts`**
- `buildInvoicePdf` nhận thêm param `locale?: 'vi' | 'en'` (default `'vi'`)
- Tất cả label trong PDF (HÓA ĐƠN → INVOICE, Mã đơn hàng → Order code, Tổng cộng → TOTAL, v.v.) dùng text từ i18n

**4. Cập nhật `payment-confirmation-email/index.ts`**
- Thêm `preferred_locale` vào query profile: `.select("..., preferred_locale")`
- Pass `locale` vào `buildPaymentConfirmationEmail()` và `buildInvoicePdf()`
- Subject email cũng theo locale

**5. Cập nhật `signup-email-otp/index.ts`**
- Khi gửi OTP: query `preferred_locale` từ profiles (nếu user đã có profile)
- Cho user mới đăng ký (chưa có profile): nhận `locale` từ request body (frontend gửi kèm)
- Pass locale vào `buildBrandedOtpEmail()`
- Subject email theo locale

**6. Cập nhật `password-reset-otp/index.ts`**
- Query `preferred_locale` từ profiles theo email
- Pass locale vào `buildBrandedOtpEmail()`
- Subject email theo locale

**7. Cập nhật `email-digest/index.ts`**
- Query `preferred_locale` từ profile
- Pass locale vào `buildBrandedDigestEmail()`

**8. Cập nhật frontend gửi locale kèm request**
- `RegisterForm.tsx`: gửi `locale` (từ `useLanguage()`) khi gọi `signup-email-otp`
- `OtpVerifyScreen.tsx`: gửi `locale` khi resend
- `LoginForm.tsx`: gửi `locale` khi resume verification

**9. Deploy lại edge functions**
- Deploy: `signup-email-otp`, `password-reset-otp`, `payment-confirmation-email`, `email-digest`

### Ví dụ text i18n

| Key | VI | EN |
|-----|----|----|
| OTP title (signup) | Xác minh tài khoản | Verify your account |
| OTP title (reset) | Đặt lại mật khẩu | Reset your password |
| Payment success | ✓ Thanh toán thành công | ✓ Payment successful |
| PDF header | HÓA ĐƠN | INVOICE |
| PDF total | TỔNG CỘNG | TOTAL |
| Billing cycle yearly | Năm | Yearly |

