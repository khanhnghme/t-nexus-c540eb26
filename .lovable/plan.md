

## Bước 11: Cập nhật utility files

### Mục tiêu
Thay role string cũ (underscore) sang format `resource:role` mới trong các utility files. Cleanup legacy fallback trong `roleLabels.ts`.

### Phạm vi thay đổi — 3 files

Sau khi quét, `ExcelMemberImport.tsx` **không chứa** role string cũ nào — loại khỏi scope.

#### 1. `src/lib/excelExport.ts` (3 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 46 | `case 'project_owner':` | `case 'project_basic:owner':` |
| 48 | `case 'project_admin':` | `case 'project_basic:admin':` |
| 50–52 | `case 'system_owner':` ... `case 'project_member':` | `case 'system:owner':` ... `case 'project_basic:member':` |

#### 2. `src/lib/roleLabels.ts` — Xóa legacy cases

Xóa tất cả legacy fallback cases (dòng 20–22, 35–39, 58–64) vì data đã migrate hoàn toàn ở Bước 3. Giữ lại chỉ các case format mới `resource:role`.

#### 3. `src/components/layout/DashboardLayout.tsx` (6 vị trí)

| Dòng | Trước | Sau |
|------|-------|-----|
| 112 | `case 'workspace_owner':` | `case 'workspace:owner':` |
| 113 | `case 'workspace_admin':` | `case 'workspace:admin':` |
| 114 | `case 'workspace_member':` | `case 'workspace:member':` |
| 120 | `case 'workspace_owner':` | `case 'workspace:owner':` |
| 121 | `case 'workspace_admin':` | `case 'workspace:admin':` |
| 122 | `case 'workspace_member':` | `case 'workspace:member':` |

### Không thay đổi
- `ExcelMemberImport.tsx`: không chứa role string cũ
- Không sửa hooks, contexts, pages, edge functions, hay database
- Không thay đổi logic, chỉ thay chuỗi so sánh và xóa legacy fallbacks

