

## Plan: Tách Authentication thành `/login` và `/register`

### Tóm tắt
Tách `MemberAuthForm` (1346 dòng) thành 2 component riêng biệt với 2 route `/login` và `/register`. Giữ nguyên toàn bộ UI/UX, logic, state. Route `/auth` redirect về `/login`.

### Changes

**File 1: `src/components/LoginForm.tsx`** (mới)
- Chứa toàn bộ logic + UI của tab `login` và `forgot` password từ `MemberAuthForm`
- Giữ nguyên: validation schema, handleLogin, forgot password flow (4 steps), Google OAuth, Turnstile, block popup, policy checkbox, pending approval screen, email verified screen
- Link "Đăng ký" → `navigate('/register')` thay vì `setActiveTab('register')`
- Khi login phát hiện email chưa verify → `navigate('/register?resume_verify=email')` kèm state

**File 2: `src/components/RegisterForm.tsx`** (mới)
- Chứa toàn bộ logic + UI của tab `register` từ `MemberAuthForm`
- Giữ nguyên: registerSchema, handleRegister, institution picker, OTP verify flow, Turnstile, policy checkbox
- Link "Đăng nhập" → `navigate('/login')` thay vì `setActiveTab('login')`
- Sau register success + verify → "Đăng nhập ngay" navigate về `/login`

**File 3: `src/pages/Login.tsx`** (mới)
- Layout giống `Auth.tsx` hiện tại (header + footer + LanguageToggle)
- Render `<LoginForm />`
- Giữ logic RememberLoginScreen từ `Auth.tsx`

**File 4: `src/pages/Register.tsx`** (mới)
- Layout giống `Auth.tsx` (header + footer + LanguageToggle)
- Render `<RegisterForm />`

**File 5: `src/App.tsx`**
- Thêm route `/login` → `Login` page
- Thêm route `/register` → `Register` page
- Thêm `/vi/login`, `/vi/register` cho localization
- Route `/auth` → `<Navigate to="/login" replace />`
- Cập nhật `ProtectedRoute` redirect từ `/auth` → `/login`

**File 6: `src/pages/Auth.tsx`**
- Giữ lại nhưng đơn giản hóa: redirect về `/login`

**File 7: `src/components/MemberAuthForm.tsx`**
- Giữ lại export legacy để không break import cũ, re-export `LoginForm`

**File 8: Cập nhật references**
- `JoinProject.tsx`: `navigate('/auth')` → `navigate('/login')`
- `Onboarding.tsx`: `Navigate to="/auth"` → `Navigate to="/login"`
- `ProtectedRoute` / `ProtectedLayout` trong App.tsx: redirect → `/login`

### Shared code
- `PolicyCheckbox` component và validation schemas (`loginSchema`, `registerSchema`) được extract vào file shared `src/components/auth/shared.tsx` để cả 2 form dùng chung
- Block popup (maintenance/suspended) cũng shared

### Technical Details
- State không cần chia sẻ giữa 2 form (login và register hoàn toàn độc lập)
- Resume verify flow (login phát hiện email chưa xác minh): navigate sang `/register` kèm search params để auto-trigger OTP screen
- Tất cả `navigate('/auth')` trong codebase sẽ được update sang `/login`

