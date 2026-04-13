

## Plan: Tách flow quên mật khẩu thành 4 route riêng

### Tóm tắt
Extract forgot password flow (4 steps trong `LoginForm.tsx` lines 496-684) thành 4 page riêng biệt. Dùng `sessionStorage` để bảo vệ `/reset-password-new` (chỉ truy cập khi OTP verified). Route `/reset-password` hiện tại (dùng cho email recovery link) giữ nguyên.

### Flow
```text
/forgot-password → nhập email → gửi OTP → navigate /verify-otp
/verify-otp → nhập OTP 6 số → verify → lưu token vào sessionStorage → navigate /reset-password-new  
/reset-password-new → nhập mật khẩu mới (guard: check sessionStorage) → reset → clear session → navigate /password-success
/password-success → thông báo thành công → nút "Đăng nhập ngay" → /login
```

Note: Dùng `/reset-password-new` thay vì `/reset-password` vì route `/reset-password` đã tồn tại cho flow recovery qua email link (Supabase magic link). Hai flow này hoàn toàn độc lập.

### Changes

**File 1: `src/pages/ForgotPassword.tsx`** (mới)
- UI từ `forgotStep === 'input'` (lines 637-682): form nhập email, gọi `password-reset-otp` action `send_code`
- Thành công → `navigate('/verify-otp', { state: { email } })`
- Nút quay lại → `/login`

**File 2: `src/pages/VerifyOtp.tsx`** (mới)
- UI từ `forgotStep === 'otp'` (lines 579-636): InputOTP 6 số, gọi `password-reset-otp` action `verify_code`
- Guard: nếu không có `location.state.email` → redirect `/forgot-password`
- Thành công → lưu `{ email, code, ts }` vào `sessionStorage('pw_reset_verified')` → navigate `/reset-password-new`
- Nút resend OTP (gọi lại `send_code`)
- Nút quay lại → `/forgot-password`

**File 3: `src/pages/ResetPasswordNew.tsx`** (mới)
- UI từ `forgotStep === 'newpass'` (lines 522-578): form mật khẩu mới + xác nhận
- Guard: đọc `sessionStorage('pw_reset_verified')`, nếu không có hoặc expired (>15 phút) → redirect `/forgot-password`
- Submit: gọi `password-reset-otp` action `reset_password` với email + code từ session
- Thành công → xóa sessionStorage → navigate `/password-success`

**File 4: `src/pages/PasswordSuccess.tsx`** (mới)
- UI từ `forgotStep === 'done'` (lines 499-521): icon thành công, nút "Đăng nhập ngay" → `/login`

**File 5: `src/components/LoginForm.tsx`**
- Xóa toàn bộ forgot password state (lines 35-41) và UI (lines 496-684)
- Xóa `activeTab` state, chỉ giữ login form
- Link "Quên mật khẩu" → `navigate('/forgot-password')` thay vì `setActiveTab('forgot')`
- Xóa import `InputOTP`, `KeyRound`, `CheckCircle2` không dùng nữa

**File 6: `src/App.tsx`**
- Import 4 page mới
- Thêm route `/forgot-password`, `/verify-otp`, `/reset-password-new`, `/password-success`
- Thêm `/vi/` variants cho localization

**File 7: `src/contexts/LanguageContext.tsx`**
- Thêm 4 path mới vào `PUBLIC_CANONICAL_PATHS`

### Security
- `/reset-password-new` bảo vệ bằng sessionStorage token (email + code + timestamp), expire 15 phút
- Sau reset thành công: xóa sessionStorage, invalidate OTP (server đã mark `used: true`)
- `/password-success` chỉ là UI tĩnh, không chứa logic nhạy cảm
- Route `/reset-password` (email recovery link) giữ nguyên, không bị ảnh hưởng

### Layout
- Tất cả 4 page mới dùng layout giống Login/Register: ForceLightMode wrapper, TNexusLogo header, Card component

