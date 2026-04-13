

## Fix: Xử lý người dùng rời trang OTP trước khi xác minh email

### Vấn đề
1. Người dùng đăng ký → tài khoản được tạo (chưa xác minh) → hiện OTP screen
2. Người dùng thoát/văng ra trang khác
3. Quay lại → đăng ký lại thì "Email/MSSV đã tồn tại" → đăng nhập thì "Invalid credentials" (vì email chưa xác minh)
→ Người dùng bị kẹt, không thể tiếp tục

### Giải pháp
Thêm action `resume_verification` trong edge function để phát hiện tài khoản chưa xác minh và gửi lại OTP. Khi đăng ký bị trùng, client tự động chuyển sang luồng xác minh thay vì hiện lỗi.

### Thay đổi — 2 files

#### 1. `supabase/functions/signup-email-otp/index.ts`

**A. Sửa logic `register` khi phát hiện trùng email:**
Khi `createUser` trả lỗi "already exists", kiểm tra xem user đó đã xác minh email chưa. Nếu chưa → tự động gửi OTP mới và trả `{ success: true, user_id, resume: true }` thay vì lỗi.

```typescript
// Trong action "register", khi createError chứa "already"/"exists":
// 1. Tìm user bằng email qua admin API
// 2. Nếu email_confirmed_at == null → gửi OTP mới, trả resume flow
// 3. Nếu đã xác minh → trả lỗi "Email đã được sử dụng" như cũ
```

**B. Thêm action `resume_verification`:**
Cho phép client gửi `{ action: "resume_verification", email }` để:
- Tìm user chưa xác minh bằng email
- Gửi OTP mới
- Trả `{ success: true, user_id, email, full_name, student_id }`

#### 2. `src/components/MemberAuthForm.tsx`

**A. Xử lý response `resume` từ register:**
Khi `registerData.resume === true`, hiện OTP screen với thông tin user trả về (thay vì hiện lỗi).

**B. Thêm xử lý khi login thất bại do email chưa xác minh:**
Sau khi `signIn` trả lỗi "Email not confirmed", gọi `resume_verification` để lấy thông tin user và chuyển sang OTP screen tự động.

```typescript
// Trong handleLogin, khi error.message chứa "Email not confirmed":
// 1. Gọi signup-email-otp { action: "resume_verification", email }
// 2. Nếu thành công → setRegUserId, setRegEmail, ... → setRegisterSuccess('verify_email')
// 3. Toast: "Email chưa xác minh. Đã gửi lại mã OTP."
```

### Kết quả
- Đăng ký lại khi chưa xác minh → tự động chuyển sang OTP (không hiện lỗi trùng)
- Đăng nhập khi chưa xác minh → tự động gửi OTP và chuyển sang màn xác minh
- Đã xác minh rồi → hoạt động bình thường như cũ

### Không thay đổi
- `OtpVerifyScreen.tsx` — không cần sửa
- Database — không cần migration
- Các edge function khác — không ảnh hưởng

