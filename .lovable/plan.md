

## Triển khai hoàn thiện chế độ Read-only

### Hiện trạng

**Đã có:**
- Hook `useAccountReadOnly` + `useAccountLimitsCheck` — phát hiện trạng thái read-only
- Banner `ReadOnlyBanner` — hiển thị trên DashboardLayout
- Hook `useReadOnlyGuard` — guardAction() hiển thị toast + block
- DB trigger `track_plan_downgrade` — tự động ghi `downgraded_at`
- Edge function `check-grace-period` — hard delete ngày thứ 31

**Đã guard (4 chỗ):**
- `Groups.tsx` — tạo project
- `GroupDetail.tsx` — tạo stage, tạo task
- `MemberManagementCard.tsx` — mời thành viên
- `TaskNotes.tsx` — upload file đính kèm

### Còn thiếu guard (12+ chỗ)

| Component | Hành động cần guard |
|-----------|-------------------|
| `TaskEditDialog.tsx` | Chỉnh sửa task (save changes) |
| `StageEditDialog.tsx` | Chỉnh sửa stage |
| `CreateMeetingDialog.tsx` | Tạo cuộc họp |
| `GroupInfoCard.tsx` | Chỉnh sửa thông tin project + upload ảnh |
| `ResourceUploadDialog.tsx` | Upload tài liệu dự án |
| `ProjectGuestInviteDialog.tsx` | Mời guest vào project |
| `ShareSettingsCard.tsx` | Chỉnh sửa cài đặt chia sẻ |
| `CreateWorkspace.tsx` | Tạo workspace mới |
| `WorkspaceSettings.tsx` | Chỉnh sửa workspace |
| `TaskComments.tsx` | Gửi comment |
| `KanbanBoard.tsx` | Kéo thả task (thay đổi status) |
| `MultiFileUploadSubmission.tsx` | Upload bài nộp |
| `StageManagement.tsx` | Quản lý stage (xóa/sắp xếp) |
| `scores/TaskScoringDialog.tsx` | Chấm điểm |
| `MemberManagementCard.tsx` | Approve/reject request, change role, bulk actions (chưa guard hết) |
| `ProjectActivityLog.tsx` | Xóa log (là hành động delete — cho phép theo chính sách) |

### Kế hoạch

#### Bước 1: Thêm `guardReadOnly()` vào tất cả mutation handlers
Với mỗi component ở trên:
1. Import `useReadOnlyGuard` 
2. Gọi `guardAction: guardReadOnly` 
3. Thêm `if (guardReadOnly()) return;` ở đầu mỗi handler tạo/sửa

**Lưu ý chính sách**: Hành động **xóa** (delete) vẫn được phép khi read-only (để dọn dẹp). Chỉ block **tạo mới** và **chỉnh sửa**.

#### Bước 2: Guard thêm các hành động trong MemberManagementCard
Các action approve request, change role, bulk role change hiện chưa có guard — cần thêm.

#### Bước 3: Disable UI buttons khi read-only
Ngoài toast block, nên disable visual các nút "Tạo", "Lưu", "Gửi" khi `isReadOnly = true` để UX rõ ràng hơn — sử dụng `isReadOnly` từ hook.

### Files cần sửa

| File | Hành động |
|------|-----------|
| `src/components/TaskEditDialog.tsx` | Guard handleSave |
| `src/components/StageEditDialog.tsx` | Guard handleSave |
| `src/components/CreateMeetingDialog.tsx` | Guard handleCreate |
| `src/components/GroupInfoCard.tsx` | Guard handleSave + upload |
| `src/components/ResourceUploadDialog.tsx` | Guard handleSubmitAll |
| `src/components/ProjectGuestInviteDialog.tsx` | Guard handleInviteGuest |
| `src/components/ShareSettingsCard.tsx` | Guard save actions |
| `src/pages/CreateWorkspace.tsx` | Guard handleSubmit |
| `src/pages/WorkspaceSettings.tsx` | Guard handleSave + handleDelete → cho phép delete |
| `src/components/communication/TaskComments.tsx` | Guard handleSendComment |
| `src/components/KanbanBoard.tsx` | Guard drag-drop status change |
| `src/components/MultiFileUploadSubmission.tsx` | Guard upload |
| `src/components/StageManagement.tsx` | Guard tạo/sửa (cho phép xóa) |
| `src/components/scores/TaskScoringDialog.tsx` | Guard handleSaveScore |
| `src/components/MemberManagementCard.tsx` | Guard thêm approve/reject/role change |

### Không thay đổi
- `useAccountReadOnly.ts`, `ReadOnlyGuard.tsx`, `ReadOnlyBanner.tsx` — đã đúng
- DB trigger `track_plan_downgrade` — đã đúng
- Edge function `check-grace-period` — đã đúng
- Hành động **xóa** — vẫn cho phép (theo chính sách dọn dẹp)

