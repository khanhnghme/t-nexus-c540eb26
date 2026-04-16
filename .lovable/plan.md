

# Plan: Đổi toàn bộ auth redirect về domain `t-nexus.io.vn`

## Tổng quan

Hiện tại có 2 nơi cần thay đổi:

1. **Frontend** (`LoginForm.tsx`): Google OAuth `redirect_uri` dùng `window.location.origin` — sẽ tự động đúng nếu user truy cập từ `t-nexus.io.vn`. Tuy nhiên cần hardcode domain chính xác để đảm bảo luôn redirect về đúng domain dù user truy cập từ bất kỳ URL nào.

2. **Edge Functions** (3 file): `appOrigin` đang hardcode `https://t-nexus.lovable.app` — cần đổi thành `https://t-nexus.io.vn`.

3. **Auth Context** (`emailRedirectTo`): Dùng `window.location.origin` — cần hardcode `https://t-nexus.io.vn`.

4. **Vercel config**: Giữ nguyên `vercel.json` vì không còn dùng Vercel nữa (chuyển sang custom domain của Lovable).

## Thay đổi cụ thể

### 1. `src/components/LoginForm.tsx`
- Dòng 432: Đổi `redirect_uri` từ `window.location.origin + '/login'` → `'https://t-nexus.io.vn/login'`

### 2. `src/contexts/AuthContext.tsx`
- Dòng 200: Đổi `emailRedirectTo` từ `${window.location.origin}/` → `'https://t-nexus.io.vn/'`

### 3. `supabase/functions/google-calendar-callback/index.ts`
- Dòng 15: Đổi `"https://t-nexus.lovable.app"` → `"https://t-nexus.io.vn"`

### 4. `supabase/functions/gmail-callback/index.ts`
- Dòng 15: Đổi `"https://t-nexus.lovable.app"` → `"https://t-nexus.io.vn"`

### 5. `supabase/functions/google-drive-callback/index.ts`
- Dòng 15: Đổi `"https://t-nexus.lovable.app"` → `"https://t-nexus.io.vn"`

## Điều kiện tiên quyết

Domain `t-nexus.io.vn` phải được cấu hình làm Custom Domain trong Lovable Project Settings → Domains, trỏ DNS về `185.158.133.1`. Nếu chưa cấu hình, Google OAuth sẽ vẫn lỗi 404 vì OAuth broker không nhận diện domain.

## Files thay đổi
1. `src/components/LoginForm.tsx`
2. `src/contexts/AuthContext.tsx`
3. `supabase/functions/google-calendar-callback/index.ts`
4. `supabase/functions/gmail-callback/index.ts`
5. `supabase/functions/google-drive-callback/index.ts`

