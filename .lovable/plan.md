

## Bước 1: Tạo `src/lib/permissions.ts` — Permission Engine trung tâm

### Mục tiêu
Tạo file mới duy nhất `src/lib/permissions.ts` chứa toàn bộ logic phân quyền theo mô hình `resource:role`. Chưa sửa bất kỳ file nào khác.

### Nội dung file mới

**Types:**
```typescript
export type RoleLevel = 'owner' | 'admin' | 'member';
export type ResourceType = 'system' | 'workspace' | 'project_basic' | 'project_page';
export type RoleString = `${ResourceType}:${RoleLevel}`;
```

**Core functions:**

| Function | Mô tả |
|----------|--------|
| `parseRole(str)` | Tách `"project_basic:admin"` → `{ resource: 'project_basic', role: 'admin' }` |
| `isAtLeast(userRole, minRole)` | So sánh hierarchy: `owner(3) > admin(2) > member(1)` |
| `can(userRole, action, targetResource)` | Kiểm tra quyền dựa trên role + action + resource, có xử lý inheritance |
| `canManageRole(actorRole, targetRole)` | Actor có thể quản lý target không (admin không tác động owner) |
| `canDeleteContent(userRole, authorId, currentUserId)` | Member chỉ xóa nội dung mình tạo |

**Actions:**
```typescript
export type Action = 'read' | 'create' | 'edit' | 'delete' | 'delete_resource' | 'manage_members' | 'billing';
```

**Permission matrix (hardcode trong file):**

| Action | owner | admin | member |
|--------|-------|-------|--------|
| read | Yes | Yes | Yes |
| create | Yes | Yes | Yes |
| edit | Yes | Yes | Yes |
| delete (sub-content) | Yes | Yes | Own only* |
| delete_resource | Yes | Sub-level only | No |
| manage_members | Yes | Yes (trừ owner) | No |
| billing | Yes | No | No |

*member delete cần `canDeleteContent()` kiểm tra `authorId === currentUserId`

**Inheritance logic:**
- `system:admin` → tự động có quyền tại mọi workspace
- `workspace:admin` → tự động có quyền tại mọi `project_basic` + `project_page` trong workspace đó
- `project_basic:admin` ≠ `project_page:admin` (độc lập, không kế thừa lẫn nhau)

### Phạm vi thay đổi
- **Tạo mới**: `src/lib/permissions.ts` (1 file)
- **Không sửa**: Không file nào khác bị thay đổi

