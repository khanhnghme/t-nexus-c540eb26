

## Bước 4: Database migration — Cập nhật DB functions sang format `resource:role`

### Mục tiêu
Một migration SQL duy nhất cập nhật tất cả DB helper functions để dùng format `resource:role` mới. Sau bước này, toàn bộ DB layer (data + functions) đều thống nhất format mới.

### Các functions cần cập nhật (8 functions)

| Function | Thay đổi |
|----------|----------|
| `is_system_owner(uuid)` | `role = 'system_owner'` → `role = 'system:owner'` |
| `is_system_admin(uuid)` | `role IN ('system_owner','system_admin')` → `role IN ('system:owner','system:admin')` |
| `is_project_leader(uuid, uuid)` | `role IN ('project_owner','project_admin')` → `role IN ('project_basic:owner','project_basic:admin')` |
| `get_workspace_role(uuid, uuid)` | Trả `'workspace:owner'` / `'workspace:admin'` thay vì `'workspace_owner'` / `'workspace_admin'` |
| `get_billing_role(uuid)` | `role = 'system_owner'` → `'system:owner'`, `role IN (...)` → format mới |
| `check_admin_user()` | Insert `'system:owner'` thay vì `'system_owner'` |
| `is_group_leader(uuid, uuid)` | Giữ nguyên (delegate to `is_project_leader`) |
| `is_group_member(uuid, uuid)` | Giữ nguyên (không dùng role string) |

### Functions giữ nguyên (không cần sửa)
- `is_admin()`, `is_leader()`, `is_moderator()`, `is_owner_system()` — chỉ delegate, không chứa role string
- `is_workspace_owner()` — check `owner_id`, không dùng role string
- `is_workspace_participant()` — không dùng role string

### Phạm vi thay đổi
- **Database**: 1 file migration SQL mới (CREATE OR REPLACE cho 6 functions)
- **Không sửa**: Không file frontend/edge function nào
- **RLS policies**: Không cần thay đổi vì đều dùng function wrapper

### Chi tiết kỹ thuật

```sql
-- is_system_owner: 'system_owner' → 'system:owner'
-- is_system_admin: IN ('system_owner','system_admin') → IN ('system:owner','system:admin')
-- is_project_leader: IN ('project_owner','project_admin') → IN ('project_basic:owner','project_basic:admin')
-- get_workspace_role: return 'workspace_owner'/'workspace_admin' → 'workspace:owner'/'workspace:admin'
-- get_billing_role: tương tự is_system_owner/admin
-- check_admin_user: INSERT role value 'system_owner' → 'system:owner'
```

