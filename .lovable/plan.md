

## Fix Google Login: tự chọn tài khoản + xử lý lỗi

### Vấn đề
1. Khi bấm "Đăng nhập bằng Google", nó tự chọn tài khoản mặc định thay vì cho user chọn
2. Sau khi redirect về, có thể báo lỗi đỏ hoặc văng ra sảnh

### Nguyên nhân
- Thiếu `prompt: "select_account"` trong Google OAuth params → Google tự chọn account đã login sẵn
- Sau khi Google redirect về, `onAuthStateChange` fire `SIGNED_IN` nhưng nếu profile chưa load xong hoặc user chưa approved → hiển thị lỗi hoặc bị redirect sai

### Thay đổi

**File: `src/components/MemberAuthForm.tsx`**

Thêm `extraParams: { prompt: "select_account" }` vào lời gọi `signInWithOAuth`:

```typescript
const result = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin,
  extraParams: {
    prompt: "select_account",
  },
});
```

Điều này buộc Google luôn hiện màn hình chọn tài khoản, ngay cả khi chỉ có 1 account.

### Không thay đổi
- AuthContext (logic đã đúng)
- Routing/redirect logic (đã xử lý approved/onboarding flow)

