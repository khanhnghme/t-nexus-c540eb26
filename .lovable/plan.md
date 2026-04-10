

## Thêm trường "Đơn vị đào tạo" vào Onboarding cho Google Login

### Vấn đề
Khi đăng nhập lần đầu bằng Google, form onboarding (step "info") thiếu trường chọn đơn vị đào tạo (institution). Trường này là bắt buộc trong hệ thống.

### Thay đổi

**File: `src/components/FirstTimeOnboarding.tsx`**

1. Thêm import `INSTITUTIONS`, `searchInstitutions` từ `@/lib/institutions`, và các component `Popover`, `Command`, `ScrollArea`, `Check` (giống MemberAuthForm)

2. Thêm state mới:
   - `editInstitution` (string, init từ profile hoặc rỗng)
   - `institutionOpen` (boolean)  
   - `institutionSearch` (string)

3. Thêm prop `userInstitution` vào component (truyền từ Onboarding.tsx)

4. Trong grid fields của step "info", thêm trường Institution dạng Popover/Command searchable dropdown (copy pattern từ MemberAuthForm) — đặt sau Student ID

5. Validation: thêm check `if (!editInstitution.trim()) errors.editInstitution = true`

6. Save: thêm `institution: editInstitution` vào `updateData`

**File: `src/pages/Onboarding.tsx`**

- Truyền thêm `userInstitution={profile.institution}` vào `<FirstTimeOnboarding>`

### Ghi chú kỹ thuật
- Dùng cùng component `Popover + Command + ScrollArea` và data source `INSTITUTIONS` + `searchInstitutions` như form đăng ký
- Trường institution là dropdown searchable (không phải text input), nhóm theo vùng miền giống form đăng ký

