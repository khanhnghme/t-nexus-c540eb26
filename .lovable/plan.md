

## Kế hoạch triển khai chi tiết — Giai đoạn 1-3

### Giai đoạn 1: Database Migration

**Migration SQL:**
```sql
-- 1. Drop UNIQUE constraint on student_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_student_id_key;

-- 2. Allow NULL and set default for student_id
ALTER TABLE public.profiles ALTER COLUMN student_id SET DEFAULT '';

-- 3. Drop the lookup function (no longer needed)
DROP FUNCTION IF EXISTS public.get_email_by_student_id(text);
```

Sau migration, `student_id` không còn là định danh duy nhất — nhiều user có thể có cùng MSSV hoặc để trống.

---

### Giai đoạn 2: Backend — Edge Functions

#### A. `supabase/functions/signup-email-otp/index.ts`

1. **Bỏ required check `student_id`** (line 48): đổi từ `!email || !student_id || !full_name || !password` → `!email || !full_name || !password`
2. **Xóa block check trùng student_id** (lines 52-60): xóa hoàn toàn query `profiles.select('id').eq('student_id', student_id)`
3. **Giữ nguyên** check trùng email (lines 62-70) và resume flow cho unverified users

#### B. `supabase/functions/manage-users/index.ts`

1. **Action `create_member`** (line 141): đổi required check từ `!email || !student_id || !full_name` → `!email || !full_name` (student_id optional)
2. Giữ nguyên logic tạo user — student_id vẫn được lưu vào metadata và profile nếu có

---

### Giai đoạn 3: Frontend

#### A. `src/components/MemberAuthForm.tsx` — Login

1. **Xóa MSSV lookup logic** (lines 290-313): bỏ block `if (!isEmail)` gọi `get_email_by_student_id`, chỉ giữ `loginEmail = input`
2. **Sửa profile approval check** (line 319): đổi `.eq(profileQuery, input)` → `.eq('email', loginEmail)`
3. **Đổi label/placeholder**: "MSSV hoặc Email" → "Email"
4. **Bỏ icon Hash** khỏi login form, chỉ dùng Mail icon

#### B. `src/components/MemberAuthForm.tsx` — Register

1. **Schema** (line 41): đổi `studentId: z.string().min(1, ...)` → `studentId: z.string().max(20).optional().or(z.literal(''))`
2. **Xóa pre-check MSSV** (lines 523-530): bỏ block `rpc('get_email_by_student_id')`
3. **Bỏ dấu `*`** trên label student_id trong form đăng ký
4. **Xóa error handling cho MSSV trùng** (line 549): bỏ condition `errMsg.includes('MSSV')`

#### C. `src/components/MemberAuthForm.tsx` — Forgot Password

1. **Xóa field MSSV** (lines 1081-1087): bỏ input `forgot-id` và state `forgotIdentifier`
2. **Xóa logic lookup** (lines 1048-1058): bỏ `rpc('get_email_by_student_id')` và cross-check email
3. **Gửi OTP trực tiếp bằng email**: `password-reset-otp({ action: 'send_code', email: forgotEmailInput })`
4. C