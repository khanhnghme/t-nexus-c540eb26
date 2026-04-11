

## Fix chống tạo project trùng lặp — Idempotency

### Hiện trạng

`Groups.tsx` đã có:
- ✅ `createLockRef` (useRef lock)
- ✅ `isCreating` state → disable button + spinner "Đang tạo..."
- ✅ Feedback toast sau khi tạo/lỗi

**Thiếu**: Idempotency key — nếu request gửi 2 lần (network retry, browser refresh), backend vẫn tạo 2 project.

`CreateWorkspace.tsx` cũng thiếu lock ref + idempotency.

### Thay đổi

**1. `src/pages/Groups.tsx`** — Thêm idempotency key
- Generate UUID (`crypto.randomUUID()`) khi mở dialog
- Gửi kèm `idempotency_key` trong `insert` data vào bảng `groups`
- Reset key khi đóng dialog hoặc tạo thành công

**2. `src/pages/CreateWorkspace.tsx`** — Thêm lock ref + idempotency
- Thêm `useRef` lock tương tự Groups
- Generate idempotency key khi mount
- Gửi kèm trong body tới edge function `workspace-management`

**3. Database migration** — Thêm cột `idempotency_key` vào bảng `groups`
```sql
ALTER TABLE public.groups ADD COLUMN idempotency_key uuid;
CREATE UNIQUE INDEX idx_groups_idempotency_key ON public.groups(idempotency_key) WHERE idempotency_key IS NOT NULL;
```
Unique index đảm bảo nếu insert trùng key → lỗi constraint → không tạo duplicate.

**4. `supabase/functions/workspace-management/index.ts`** — Idempotency cho workspace
- Nhận `idempotency_key` từ body
- Check existing workspace với cùng key trước khi insert
- Nếu đã tồn tại → trả về workspace cũ thay vì tạo mới

### Files cần sửa

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm cột `idempotency_key` + unique index trên `groups` |
| `src/pages/Groups.tsx` | Generate + gửi idempotency_key |
| `src/pages/CreateWorkspace.tsx` | Thêm lock ref + idempotency |
| `supabase/functions/workspace-management/index.ts` | Check idempotency cho create_workspace |

