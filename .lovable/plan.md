

## Nâng cấp: Hiển thị thông tin người dùng khi nhập đúng email trong form mời workspace

### Mục tiêu

Khi mời thành viên vào workspace, sau khi nhập **chính xác toàn bộ email**, hệ thống sẽ hiển thị preview thông tin người dùng (tên, avatar). Không hỗ trợ tìm kiếm theo tên, MSSV hay bất kỳ trường nào khác — chỉ email chính xác.

### Thay đổi

#### 1. Database — Tạo function `lookup_user_by_email` (SECURITY DEFINER)

```sql
CREATE FUNCTION public.lookup_user_by_email(p_email text)
RETURNS json SECURITY DEFINER AS $$
  SELECT json_build_object(
    'id', id, 'full_name', full_name, 'avatar_url', avatar_url, 'email', email
  )
  FROM public.profiles WHERE email = p_email;
$$;
```

Function chỉ trả về 4 trường không nhạy cảm. Chỉ người đã đăng nhập (authenticated) mới gọi được — sẽ thêm check `auth.uid() IS NOT NULL` trong function body.

#### 2. `src/pages/WorkspaceMembers.tsx` — Thêm user preview

- Thêm state `previewUser` và debounce logic
- Khi email input thay đổi: validate format email hợp lệ → gọi `supabase.rpc('lookup_user_by_email', { p_email })` 
- Hiển thị card preview (avatar + tên + email) bên dưới input khi tìm thấy
- Nếu không tìm thấy → hiển thị nhẹ "Người dùng chưa có tài khoản — lời mời sẽ được gửi qua email"
- Debounce 500ms để tránh spam API

#### 3. `src/components/ProjectGuestInviteDialog.tsx` — Áp dụng tương tự

- Cùng logic preview khi nhập email mời khách vào dự án

### File thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/migrations/` | Tạo function `lookup_user_by_email` |
| `src/pages/WorkspaceMembers.tsx` | Thêm preview user sau input email |
| `src/components/ProjectGuestInviteDialog.tsx` | Thêm preview user sau input email |

### Bảo mật

- Function yêu cầu `auth.uid() IS NOT NULL` — chỉ user đã đăng nhập mới tra cứu được
- Không trả về dữ liệu nhạy cảm (chỉ full_name, avatar_url, email)
- Không hỗ trợ tìm kiếm mờ (LIKE/ILIKE) — chỉ exact match
- Rate limiting tự nhiên qua debounce 500ms phía client

