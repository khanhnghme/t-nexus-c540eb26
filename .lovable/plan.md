

## Bước 12: Cập nhật Edge Functions

### Mục tiêu
Thay tất cả role string cũ (underscore) sang format `resource:role` mới trong 3 edge functions.

### Lưu ý quan trọng
Database function `get_workspace_role()` đã trả về format mới (`workspace:owner`, `workspace:admin`) từ Bước 3. Nên các so sánh với kết quả RPC **phải** dùng format mới, nếu không sẽ **luôn fail**.

### Phạm vi thay đổi — 3 files

#### 1. `supabase/functions/workspace-management/index.ts` (~20 vị trí)

**So sánh với kết quả `get_workspace_role()` RPC:**
| Dòng | Trước | Sau |
|------|-------|-----|
| 166 | `"workspace_owner"` / `"workspace_admin"` | `"workspace:owner"` / `"workspace:admin"` |
| 226 | `"workspace_owner"` / `"workspace_admin"` | `"workspace:owner"` / `"workspace:admin"` |
| 349-350 | `"workspace_owner"` / `"workspace_admin"` | `"workspace:owner"` / `"workspace:admin"` |
| 564 | `"workspace_admin"` | `"workspace:admin"` |
| 653 | `"workspace_owner"` / `"workspace_admin"` | `"workspace:owner"` / `"workspace:admin"` |
| 667,672 | `"workspace_admin"` | `"workspace:admin"` |

**Default role khi insert/validate:**
| Dòng | Trước | Sau |
|------|-------|-----|
| 216 | `"workspace_member"` | `"workspace:member"` |
| 217-218 | validate `"workspace_admin"` / `"workspace_member"` | `"workspace:admin"` / `"workspace:member"` |
| 522 | insert `"workspace_member"` | `"workspace:member"` |
| 615 | insert `"workspace_member"` | `"workspace:member"` |
| 703-704 | validate `"workspace_admin"` / `"workspace_member"` | `"workspace:admin"` / `"workspace:member"` |
| 875 | insert `"workspace_admin"` | `"workspace:admin"` |

**Project role so sánh:**
| Dòng | Trước | Sau |
|------|-------|-----|
| 334 | `"project_member"` | `"project_basic:member"` |
| 351-352 | `"project_owner"` / `"project_admin"` | `"project_basic:owner"` / `"project_basic:admin"` |
| 573 | `["project_owner", "project_admin"]` | `["project_basic:owner", "project_basic:admin"]` |

**Display labels (trả về client):**
| Dòng | Trước | Sau |
|------|-------|-----|
| 762 | `my_role: "workspace_owner"` | `my_role: "workspace:owner"` |
| 821 | `role: "workspace_owner"` | `role: "workspace:owner"` |

#### 2. `supabase/functions/team-assistant/index.ts` (3 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 317 | `m.role === 'project_owner' \|\| m.role === 'project_admin'` | `m.role === 'project_basic:owner' \|\| m.role === 'project_basic:admin'` |
| 351 | `context.currentUser.role === 'project_owner' \|\| ... 'project_admin'` | `... 'project_basic:owner' \|\| ... 'project_basic:admin'` |
| 887 | `'project_member'` (fallback) | `'project_basic:member'` |

#### 3. `supabase/functions/ensure-owner/index.ts` (2 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 59 | `role: 'system_owner'` | `role: 'system:owner'` |
| 92 | `role: 'system_owner'` | `role: 'system:owner'` |

### Không thay đổi
- Không sửa client-side code, hooks, contexts, hay pages
- Không sửa database functions hay migrations (đã cập nhật ở Bước 3)
- Các edge functions khác (`manage-users`, `email-digest`, `process-plan-cycle`, v.v.) không chứa role strings cần thay

### Rủi ro
- `workspace-management` là edge function quan trọng nhất — nếu bỏ sót 1 vị trí, permission check sẽ **luôn fail** vì RPC đã trả format mới
- Cần deploy lại cả 3 edge functions sau khi sửa

