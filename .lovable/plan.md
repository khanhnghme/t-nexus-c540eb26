

## Bug Analysis: Google Login Redirect Issue

**Root Cause**: When user clicks "Login with Google", `redirect_uri` is set to `window.location.origin` (e.g. `https://t-nexus.lovable.app`). After Google OAuth completes successfully:
1. Session is set via `lovable.auth.signInWithOAuth` → `supabase.auth.setSession`
2. User is redirected to `/` (Landing page)
3. Landing page has NO logic to detect authenticated users and redirect to `/dashboard`
4. `MemberAuthForm` (on `/auth`) has this redirect logic, but user never reaches it

**Fix**: Two changes needed.

### 1. Change `redirect_uri` to `/auth`
In `MemberAuthForm.tsx`, change `redirect_uri` from `window.location.origin` to `window.location.origin + '/auth'`. This way, after Google OAuth, user returns to the Auth page where `MemberAuthForm`'s existing `useEffect` already handles redirect to `/dashboard` when `user && profile && profile.is_approved`.

### 2. Add safety redirect in Landing page
Add a simple `useEffect` in `Landing.tsx` that checks if user is authenticated + approved and redirects to `/dashboard`. This acts as a safety net for any scenario where an authenticated user lands on `/`.

### Files to modify
- `src/components/MemberAuthForm.tsx` — line ~802: change `redirect_uri`
- `src/pages/Landing.tsx` — add auth-aware redirect logic

