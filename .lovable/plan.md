

## Lỗi: Login thất bại vì RLS chặn truy vấn profiles trước khi đăng nhập

### Nguyên nhân gốc

Khi login, code gọi `supabase.from('profiles').select('is_approved, full_name').eq('email', loginEmail)` **trước** khi user đăng nhập. Lúc này request dùng anon key (chưa xác thực).

Các RLS policy trên bảng `profiles` chỉ cho phép SELECT khi:
- `is_approved = true OR id = auth.uid() OR is_admin(auth.uid())` — nhưng `auth.uid()` = NULL vì chưa đăng nhập
- Policy này **có** cho phép đọc `is_approved = true` records... nhưng cần kiểm tra lại vì network request trả về `[]`.

Thực tế: Policy `Users can view all approved profiles` có `qual = (is_approved = true) OR (id = auth.uid()) OR is_admin(auth.uid())` — đáng ra phải trả về profile có `is_approved = true`. Tuy nhiên, policy này dùng `to authenticated` (chỉ áp dụng cho role `authenticated`, không áp dụng cho role `anon`).

### Giải pháp

Thêm 1 RLS policy cho phép **anon** role SELECT cột `is_approved, full_name` trên bảng `profiles` khi filter theo `email`. Cụ thể:

**Database Migration:**
```sql
CREATE POLICY "Anon can check profile approval by email"
ON public.profiles
FOR SELECT
TO anon
USING (true);
```

Tuy nhiên, để không lộ toàn bộ dữ liệu profile cho anon, cách tốt hơn là **tạo một database function** `SECURITY DEFINER` để kiểm tra:

```sql
CREATE OR REPLACE FUNCTION public.check_profile_login(p_email text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object('is_approved', is_approved, 'full_name', full_name)
  INTO result
  FROM public.profiles
  WHERE email = p_email;
  
  RETURN result;
END;
$$;
```

Sau đó cập nhật `MemberAuthForm.tsx` để gọi `supabase.rpc('check_profile_login', { p_email: loginEmail })` thay vì query trực tiếp bảng profiles.

### Các bước triển khai

1. **Database migration** — Tạo function `check_profile_login` (SECURITY DEFINER, bypass RLS)
2. **MemberAuthForm.tsx** — Thay đổi query `profiles` bằng `supabase.rpc('check_profile_login', ...)` tại phần login (khoảng line 292-296) và phần forgot password nếu cũng query tương tự

### File thay đổi
- `supabase/migrations/` — migration mới
- `src/components/MemberAuthForm.tsx` — 1-2 chỗ thay query

