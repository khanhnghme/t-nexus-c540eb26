

## Plan: Fix QR Join Route & Improve Instructions

### Problem
1. QR code links (`https://t-nexus.io.vn/join?code=XXXXXX`) return 404 — no `/join` route exists
2. Invitation image instructions are vague and incomplete
3. No auto-redirect after login for unauthenticated users visiting join links

### Changes

**File 1: `src/pages/JoinProject.tsx`** (NEW)
- Create a new page component that handles `/join?code=XXXXXX`
- Logic:
  - Parse `code` from URL query params
  - If user is logged in: auto-open `JoinByCodeDialog` with the code pre-filled, auto-trigger lookup
  - If user is NOT logged in: show a message "Bạn cần đăng nhập để tham gia dự án" with a login button that redirects to `/auth?redirect=/join?code=XXXXXX`
  - After successful join, redirect to the project

**File 2: `src/App.tsx`**
- Add route: `<Route path="/join" element={<JoinProject />} />`
- Place in non-localized public routes section (line ~176)

**File 3: `src/pages/Auth.tsx`**
- After successful login (in `RememberLoginScreen` or after auth completes), check for `redirect` query param
- If `redirect` starts with `/join`, navigate there instead of `/dashboard`

**File 4: `src/components/ShareSettingsCard.tsx`**
- Update the invitation image instructions (lines 222-228):
  - Step 1: "Truy cập t-nexus.io.vn/join?code=XXXXXX hoặc quét mã QR"
  - Step 2: "Đăng nhập tài khoản T-Nexus"  
  - Step 3: "Xác nhận tham gia dự án"
- Clearer, more accurate 3-step flow matching the actual UX

**File 5: `src/components/AuthForm.tsx` or `src/components/MemberAuthForm.tsx`**
- After successful login, check `sessionStorage` or URL for pending join redirect
- If found, navigate to the stored `/join?code=...` URL

### Technical Details
- The `/join` page uses `useSearchParams` to read the code
- Pre-fill is done by passing the code as a prop to `JoinByCodeDialog` and auto-triggering `handleLookupWithCode`
- Redirect flow: store redirect URL in `sessionStorage` key `t-nexus_post_login_redirect` before navigating to `/auth`, then consume it after login
- The `/join` route is public (not wrapped in `ProtectedRoute`) so unauthenticated users can see the login prompt

