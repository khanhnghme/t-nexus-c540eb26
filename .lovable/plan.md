

## Plan: Fix UI freeze khi đóng popup/dialog toàn hệ thống + Fix build error

### 2 vấn đề cần sửa

**Vấn đề 1 — UI freeze khi đóng dialog**

Nguyên nhân gốc: Radix UI `AlertDialogAction` tự động đóng dialog ngay khi click. Khi kết hợp với async handler (gọi API, update state), xảy ra xung đột:
1. Radix đóng dialog → unmount component
2. Async handler hoàn thành → cố update state trên component đã unmount
3. React báo lỗi / UI đứng hoàn toàn

Giải pháp: Thay tất cả `AlertDialogAction` có async onClick bằng `Button` thường. `Button` không tự đóng dialog, cho phép code kiểm soát thời điểm đóng.

**Vấn đề 2 — Build error email-i18n.ts**

`EmailTexts` type dùng literal types từ `texts['vi']`, không tương thích với `texts['en']`. Fix: đổi return type thành union hoặc dùng interface thay vì `as const` literal.

### Files cần sửa (Vấn đề 1) — 12+ files

Thay `AlertDialogAction onClick={handleXxx}` → `Button onClick={handleXxx}` trong:

1. `src/components/ProjectResources.tsx` — 3 chỗ (handleDelete, handleDeleteFolder, handleBatchDelete)
2. `src/components/MemberRoleManagementDialog.tsx` — handleDemote
3. `src/components/MemberManagementCard.tsx` — handleBulkChangeRole
4. `src/components/TaskListView.tsx` — 3 chỗ (handleDeleteTask, handleBulkDelete, handleBulkStatusChange)
5. `src/components/ProjectActivityLog.tsx` — 2 chỗ (handleDeleteAll, handleDeleteSelected)
6. `src/components/SystemErrorLogs.tsx` — handleClearAll
7. `src/components/communication/MessageItem.tsx` — handleDelete
8. `src/components/settings/ConnectedServicesCard.tsx` — handleDisconnect
9. `src/pages/GroupDetail.tsx` — handleDeleteStage, handleDeleteGroup
10. `src/pages/MemberManagement.tsx` — handleDeleteMember
11. `src/pages/AdminActivity.tsx` — handleDeleteByDateRange
12. `src/pages/AdminSystem.tsx` — handleSaveMaintenance
13. `src/components/AdminDataMigration.tsx` — handleImport
14. `src/components/canvas/CanvasSidebar.tsx` — nếu có async handler
15. `src/components/TaskSubmissionDialog.tsx` — nếu có async handler

Mỗi chỗ sửa theo pattern:
```tsx
// TRƯỚC (lỗi)
<AlertDialogAction onClick={handleAsync}>Xác nhận</AlertDialogAction>

// SAU (fix)
<Button onClick={handleAsync}>Xác nhận</Button>
```

### File cần sửa (Vấn đề 2)

`supabase/functions/_shared/email-i18n.ts` — line 220-223:
```ts
export type EmailTexts = (typeof texts)['vi'] | (typeof texts)['en'];
// hoặc dùng Record<string, ...> thay vì literal
```

### Tổng: ~16 files sửa, không thêm file mới

