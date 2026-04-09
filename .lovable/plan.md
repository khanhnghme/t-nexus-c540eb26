

## Plan: Triển khai giới hạn "Xuất dữ liệu đầy đủ" theo gói cước

### Hiện trạng
- Pricing table đã ghi: Free = ✗, Plus/Pro/Business = ✓
- Bảng `plan_limits` chưa có cột cho tính năng này
- Tất cả chức năng xuất dữ liệu hiện hoạt động không kiểm tra gói cước

### Phạm vi ảnh hưởng — 4 tính năng export cần gate

| Tính năng | Component | Vị trí |
|-----------|-----------|--------|
| Xuất minh chứng PDF | `ProjectEvidenceExport.tsx` | Tab Quản lý trong GroupDetail |
| Sao lưu dự án (ZIP) | `AdminBackupRestore.tsx` | Trang Admin Backup |
| Xuất Excel thành viên (project) | `MemberManagementCard.tsx` | Tab thành viên project |
| Xuất PDF nhật ký | `ProjectActivityLog.tsx` | Tab nhật ký project |

> **Lưu ý**: Xuất Excel thành viên **hệ thống** (trang Admin) và Data Migration (admin) KHÔNG bị giới hạn vì đây là chức năng admin hệ thống.

### Thay đổi

**1. Migration — thêm cột `can_export_data` vào `plan_limits`**
```sql
ALTER TABLE plan_limits ADD COLUMN can_export_data boolean NOT NULL DEFAULT false;
UPDATE plan_limits SET can_export_data = false WHERE plan = 'plan_free';
UPDATE plan_limits SET can_export_data = true WHERE plan IN ('plan_plus', 'plan_pro', 'plan_business', 'plan_custom');
```

**2. `usePlanLimits.ts` — thêm `canExportData: boolean`**
- Thêm field vào interface + fetch logic
- Default `false` khi chưa load xong

**3. Gate tại 4 component export**

Tại mỗi component, kiểm tra `canExportData` từ `usePlanLimits()`:
- Nếu `false` (Free): hiển thị thông báo khóa + nút nâng cấp, vô hiệu hóa nút xuất
- Nếu `true` (Plus+): hoạt động bình thường

Cách hiển thị khi bị khóa:
- `ProjectEvidenceExport.tsx`: Thay nội dung card bằng banner khóa + link nâng cấp
- `AdminBackupRestore.tsx`: Disable nút backup, hiển thị cảnh báo
- `MemberManagementCard.tsx`: Disable nút "Xuất Excel", tooltip giải thích
- `ProjectActivityLog.tsx`: Disable nút "Xuất PDF", tooltip giải thích

**4. i18n — thêm chuỗi**
- `exportDataLocked`: "Tính năng xuất dữ liệu chỉ dành cho gói Plus trở lên"
- `upgradeToExport`: "Nâng cấp để xuất dữ liệu"

### Files

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm cột `can_export_data` + seed |
| `src/hooks/usePlanLimits.ts` | Thêm `canExportData` |
| `src/components/ProjectEvidenceExport.tsx` | Gate xuất PDF minh chứng |
| `src/components/AdminBackupRestore.tsx` | Gate sao lưu dự án |
| `src/components/MemberManagementCard.tsx` | Gate xuất Excel thành viên |
| `src/components/ProjectActivityLog.tsx` | Gate xuất PDF nhật ký |
| `src/lib/i18n/en.ts` | Thêm chuỗi export limit |
| `src/lib/i18n/vi.ts` | Thêm chuỗi export limit |

