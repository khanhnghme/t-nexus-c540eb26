

## Bước 9: Cập nhật components — Project content

### Mục tiêu
Thay role string cũ (underscore) sang format `resource:role` mới trong các component liên quan đến nội dung project.

### Phạm vi thay đổi — 3 files

Sau khi quét toàn bộ các file được liệt kê ở Bước 9, chỉ có **3 files** thực sự chứa role strings cần thay đổi. Các file khác (`GroupInfoCard`, `ProjectNavigation`, `ShareSettingsCard`, `StageManagement`, `TaskCard`, `KanbanBoard`, `ReadOnlyBanner`, scores components, canvas components) **không chứa** role string cũ nào.

#### 1. `src/components/GroupDashboard.tsx` (1 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 59 | `useState<ProjectRole>('project_member')` | `useState<ProjectRole>('project_basic:member')` |

#### 2. `src/components/TaskEditDialog.tsx` (1 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 542 | `member.role === 'project_admin'` | `member.role === 'project_basic:admin'` |

#### 3. `src/components/public/PublicMemberList.tsx` (3 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 69 | `member.role === 'project_admin'` | `member.role === 'project_basic:admin'` |
| 70 | `member.role === 'project_admin'` | `member.role === 'project_basic:admin'` |
| 72 | `member.role === 'project_admin'` | `member.role === 'project_basic:admin'` |

### Không thay đổi
- `PublicActivityLog.tsx`: `'project_member'` ở dòng 26 là **activity type**, không phải role — giữ nguyên
- Không sửa hooks, contexts, pages, edge functions, hay database
- Không thay đổi logic, chỉ thay chuỗi so sánh

