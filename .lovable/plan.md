

## Plan: Fix OTP email layout + PDF invoice logo size

### 1. Redesign OTP digit boxes trong email (`email-html-builder.ts`)

**Vấn đề**: 6 ô OTP hiện tại dùng `<table>` với mỗi ô `width:46px` + padding `4px` — trên màn hình nhỏ có thể bị tràn/rớt dòng.

**Giải pháp**:
- Wrap OTP table trong `<div style="text-align:center">` và thêm `align="center"` cho table
- Giảm kích thước ô: `width:40px; height:50px; font-size:24px` (mặc định), responsive mobile: `width:34px; height:44px; font-size:20px`
- Giảm padding giữa các ô: `padding:0 3px`
- Thêm responsive class cho toàn bộ OTP container với `max-width` phù hợp
- Cập nhật media query `@media (max-width:600px)` cho `.otp-digit` xuống `width:34px; height:44px; font-size:20px`

### 2. Giảm kích thước logo trong PDF invoice (`invoice-pdf-builder.ts`)

**Vấn đề**: `logoDisplayW = 130` quá lớn, logo bị rớt/chiếm quá nhiều không gian.

**Giải pháp**:
- Giảm `logoDisplayW` từ `130` xuống `90`
- Logo sẽ nhỏ gọn hơn, nằm gọn bên phải header

### Files thay đổi
- `supabase/functions/_shared/email-html-builder.ts` — OTP digit boxes + responsive
- `supabase/functions/_shared/invoice-pdf-builder.ts` — logo width 130 → 90
- Deploy: `payment-confirmation-email`, `signup-email-otp`, `password-reset-otp`

