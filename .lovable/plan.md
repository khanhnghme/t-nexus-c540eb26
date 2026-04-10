

## Tích hợp đăng nhập Google OAuth

### Tổng quan
Thêm nút "Đăng nhập bằng Google" vào form đăng nhập. Sử dụng Lovable Cloud managed Google OAuth (không cần API key riêng).

### Luồng hoạt động

```text
User clicks "Sign in with Google"
  → Google OAuth redirect
  → Returns to app
  → Check profile in DB:
     ├── Email exists + is_approved → Dashboard (or Onboarding if not completed)
     ├── Email exists + not approved → Show pending screen
     └── Email NOT exists → Profile auto-created by handle_new_user trigger
         → student_id = '' (empty) → onboarding_completed = false
         → Redirect to /onboarding → User fills student_id, institution, etc.
```

### Thay đổi chi tiết

**1. Chạy tool "Configure Social Auth"** để tạo `src/integrations/lovable/` module cho Google OAuth.

**2. `src/components/MemberAuthForm.tsx`**

- Import `lovable` từ `@/integrations/lovable/index`
- Thêm state `googleLoading`
- Thêm hàm `handleGoogleLogin`:
  - Gọi `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
  - Xử lý error/redirect
- Thêm nút Google ngay trước form đăng nhập (trong tab login):
  - Divider "hoặc" giữa nút Google và form email/password
  - Style: outlined button với Google icon, full width
- Nút Google không yêu cầu Turnstile captcha hay policy checkbox

**3. `src/contexts/AuthContext.tsx`**

- Trong `onAuthStateChange` handler (event `SIGNED_IN`):
  - Sau khi fetchProfile, nếu profile có `student_id` rỗng → đây là user Google mới
  - Logic hiện tại đã đủ: Dashboard.tsx redirect tới `/onboarding` nếu `onboarding_completed = false`
  - Không cần thay đổi AuthContext

**4. `src/pages/Onboarding.tsx` + `src/components/FirstTimeOnboarding.tsx`**

- Onboarding đã có sẵn các step thu thập student_id, full_name, institution
- Bổ sung logic: nếu profile đến từ Google OAuth (có avatar_url, full_name đã có sẵn) → pre-fill các field tương ứng
- Ẩn step đổi password nếu user đăng nhập bằng Google (kiểm tra `user.app_metadata.provider === 'google'` hoặc không có `must_change_password`)

**5. `src/lib/i18n/en.ts` + `vi.ts`**

Thêm keys:
- `googleLoginBtn`: "Continue with Google" / "Đăng nhập bằng Google"
- `orDivider`: "or" / "hoặc"

**6. `src/pages/Auth.tsx`**

- Thêm xử lý cho OAuth callback: khi user quay về từ Google, `onAuthStateChange` sẽ fire `SIGNED_IN` tự động
- Đã xử lý đúng: nếu profile chưa approved → pending screen, nếu chưa onboarding → redirect onboarding

### Logic xử lý trùng email

- Supabase mặc định: nếu email Google trùng email đã đăng ký → tự động link identity vào account cũ (không tạo trùng)
- Không cần code xử lý thêm

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/integrations/lovable/` | Auto-generated bởi Configure Social Auth tool |
| `src/components/MemberAuthForm.tsx` | Thêm nút Google + handler |
| `src/components/FirstTimeOnboarding.tsx` | Pre-fill data từ Google, ẩn step password cho OAuth users |
| `src/lib/i18n/en.ts` | Thêm `googleLoginBtn`, `orDivider` |
| `src/lib/i18n/vi.ts` | Tương ứng tiếng Việt |

### Không thay đổi
- Database schema (handle_new_user trigger đã xử lý đúng)
- AuthContext (logic đã đủ)
- Routing (Onboarding redirect đã có sẵn)

