

## Fix: Registration "Edge Function returned a non-2xx status code"

### Root Cause Analysis

**Issue 1 — Lost error messages**: The `signup-email-otp` edge function returns HTTP 409/500 for errors. But `supabase.functions.invoke()` treats any non-2xx response as a generic `FunctionsHttpError` with message "Edge Function returned a non-2xx status code", discarding the actual error body (e.g., "Email đã được sử dụng"). The client code at line 518 tries to read `registerData?.error` but `registerData` is null.

**Issue 2 — Undetected duplicate email**: The user `tranguyen.31241570200@st.ueh.edu.vn` exists in `auth.users` but NOT in `profiles` table (likely from a previous failed/partial signup). The edge function checks `profiles` for duplicates (lines 52-69) but misses the auth.users entry, so `createUser` fails at line 72.

**Issue 3 — insertBefore crash (image 2)**: This is a known React reconciliation error when conditional rendering changes DOM structure while OTP input is focused. Already documented in project memory.

### Fix — 2 files

#### 1. `supabase/functions/signup-email-otp/index.ts`

Following the project pattern (see memory: "thong-bao-loi-han-muc-workspace"), change error responses to return HTTP 200 with error details in the body instead of 409/500:

```typescript
// Before: return jsonResponse({ error: "Email đã được sử dụng." }, 409);
// After:  return jsonResponse({ error: "Email đã được sử dụng.", success: false });
```

Apply this to all error returns in the `register` action (lines 59, 69, 84, 85). Keep 400 for missing fields validation only.

Also add a check against `auth.users` via `supabase.auth.admin.listUsers()` or handle the `email_exists` error code more gracefully.

#### 2. `src/components/MemberAuthForm.tsx`

Update error handling (line 515-525) to also extract error from `registerError` context when `registerData` is null:

```typescript
if (registerError || !registerData?.success) {
  const errMsg = registerData?.error 
    || (registerError as any)?.context?.body // try to get body
    || registerError?.message 
    || ta.toastRegisterFailed;
  // ... toast logic
}
```

### Not changed
- OtpVerifyScreen.tsx — the insertBefore error is a separate known issue (React reconciliation), not related to registration failure
- Database tables — no schema changes needed

