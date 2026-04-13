

## Bước 10: Canvas/Page components — `usePageRole` hook + page-level permissions

### Mục tiêu
1. Tạo hook `usePageRole(pageId)` để truy vấn `page_members` table và trả về effective role (page role → project role fallback → workspace inheritance).
2. Cập nhật `CanvasPageView.tsx` để sử dụng `usePageRole` xác định quyền edit thay vì chỉ dựa vào prop `editable` từ parent.
3. Sửa role strings cũ còn sót trong `GroupDetail.tsx` (file parent truyền `editable` cho Canvas).

### Phạm vi thay đổi — 3 files (1 mới, 2 sửa)

#### 1. TẠO MỚI: `src/hooks/usePageRole.ts`

Hook trả về effective page role cho user hiện tại:
- Query `page_members` table theo `pageId` + `user.id`
- Nếu có record → trả về page role (`project_page:owner/admin/member`)
- Nếu không → fallback sang project role từ `group_members` (đã là `project_basic:*`)
- Nếu không có project role → check workspace inheritance qua `get_workspace_role()`
- Trả về `{ pageRole, canEdit, isLoading }`
  - `canEdit = true` nếu role level là `owner` hoặc `admin` (dùng `parseRole` + `isAtLeast` từ permissions.ts)

#### 2. `src/components/canvas/CanvasPageView.tsx`

- Import và sử dụng `usePageRole(activePageId)` 
- Kết hợp `canEdit` từ hook với prop `editable` hiện tại: `const effectiveEditable = editable || canEditPage`
- Dùng `effectiveEditable` thay cho `editable` trong logic toggle edit mode và truyền xuống CanvasEditor/CanvasSidebar

#### 3. `src/pages/GroupDetail.tsx` (2 vị trí role strings cũ)

| Dòng | Trước | Sau |
|------|-------|-----|
| 257 | `myMembership?.role === 'project_admin' \|\| myMembership?.role === 'project_owner'` | `myMembership?.role === 'project_basic:admin' \|\| myMembership?.role === 'project_basic:owner'` |
| 670 | `m.role === 'project_admin'` | `m.role === 'project_basic:admin'` |

### Không thay đổi
- `CanvasEditor.tsx` và `CanvasSidebar.tsx`: không chứa role strings, chỉ nhận `editable` prop — không cần sửa
- Không sửa database, edge functions, hay migration
- `page_members` table đã tồn tại (tạo ở Bước 3)

