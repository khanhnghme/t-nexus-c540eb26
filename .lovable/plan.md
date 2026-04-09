

## Plan: Chặn truy cập trái phép vào Dự án và Workspace

### Vấn đề hiện tại
- Trang `GroupDetail` (chi tiết dự án) **không kiểm tra** người dùng có phải thành viên hay không — ai có URL đều truy cập được
- Trang `Groups` hiển thị các project `workspace_public` cho workspace member — nhưng không chặn khi truy cập trực tiếp
- RLS cho phép `created_by` (người tạo) xem group data ngay cả khi không phải member → cần kiểm tra ở frontend

### Giải pháp: Trang 403 + Access Guard

**1. Tạo component `AccessDenied` (trang 403)**
- File mới: `src/components/AccessDenied.tsx`
- Giao diện sạch, icon khóa, thông báo "Bạn không có quyền truy cập" / "You don't have access"
- Nút quay lại trang chủ
- Hỗ trợ i18n (en/vi)

**2. Sửa `GroupDetail.tsx` — thêm access check**
- Sau khi fetch `groupData` thành công, kiểm tra:
  - Nếu project `private`: user phải là member (`group_members`) hoặc system admin
  - Nếu project `workspace_public`: user phải là workspace participant hoặc member
  - Nếu project `public_link`: cho phép (giữ nguyên)
- Nếu không đủ quyền → hiển thị `AccessDenied` thay vì nội dung dự án

**3. Sửa `Groups.tsx` — đảm bảo danh sách đúng**
- Hiện tại đã lọc đúng (chỉ hiện joined + workspace_public nếu là WS member) → giữ nguyên

**4. Thêm i18n keys**
- `app.accessDenied.title`: "Access Denied" / "Từ chối truy cập"
- `app.accessDenied.description`: "You are not a member..." / "Bạn không phải thành viên..."
- `app.accessDenied.backHome`: "Back to Home" / "Về trang chủ"

### Technical Details

```text
GroupDetail.tsx flow:
  fetch groupData → fetch membersData
    → check: user in membersData? OR isAdmin?
       → YES: render normally
       → NO: check visibility
          → workspace_public? check workspace participant
          → private? → show AccessDenied
          → public_link? → allow
```

### Files to modify
| File | Change |
|------|--------|
| `src/components/AccessDenied.tsx` | New — 403 page component |
| `src/pages/GroupDetail.tsx` | Add membership check after data fetch |
| `src/lib/i18n/en.ts` | Add `accessDenied` keys |
| `src/lib/i18n/vi.ts` | Add `accessDenied` keys |

