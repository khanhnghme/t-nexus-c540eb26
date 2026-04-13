

## Plan: Thêm logo T-Nexus text vào PDF invoice và tất cả email

### Tổng quan
- Thay text "T-Nexus" trong header email và PDF bằng **ảnh logo T-Nexus text** (`t-nexus-text.png`)
- Áp dụng cho: email OTP đăng ký, OTP quên mật khẩu, email bill thanh toán, email digest
- Cập nhật PDF invoice để nhúng logo thay vì text thuần

### Các bước thực hiện

**1. Upload logo T-Nexus text lên storage công khai**
- Upload file `src/assets/t-nexus-text.png` lên Supabase Storage bucket `system-assets` (đã public)
- Lấy public URL để dùng trong email HTML (email client cần URL tuyệt đối, không dùng base64)

**2. Tạo base64 của logo T-Nexus text cho PDF**
- Convert `src/assets/t-nexus-text.png` sang base64 string
- Cập nhật file `supabase/functions/_shared/invoice-pdf-builder.ts`:
  - Embed logo PNG base64 trực tiếp trong file
  - Dùng `pdfDoc.embedPng()` để nhúng logo vào PDF header (góc phải)
  - Thay dòng `drawText("T-Nexus", ...)` bằng `page.drawImage(logoImage, ...)`

**3. Cập nhật email HTML builder — thêm logo vào header**
- Sửa `supabase/functions/_shared/email-html-builder.ts`:
  - Trong `emailHeader()`: thay `<span>T-Nexus</span>` bằng `<img src="[PUBLIC_URL]/t-nexus-text.png" alt="T-Nexus" width="120" height="auto">`
  - Giữ alt text "T-Nexus" làm fallback
  - Tất cả email (OTP, reset password, payment, digest) tự động cập nhật vì dùng chung `emailHeader()`

**4. Thiết kế lại email sạch hơn**
- Cải thiện spacing, padding trong email body
- Tăng khoảng cách giữa các section
- Typography rõ ràng hơn, dễ đọc hơn

**5. Deploy lại edge functions**
- Deploy: `signup-email-otp`, `password-reset-otp`, `payment-confirmation-email`, `email-digest`

### Lưu ý
- Logo trong email **phải** dùng URL tuyệt đối (nhiều email client block base64/CID images)
- Logo trong PDF dùng base64 embed (OK cho PDF)
- Bucket `system-assets` đã public nên URL truy cập được từ mọi email client

