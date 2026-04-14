<final-text>## Plan: Fix triệt để lỗi đứng web khi đóng popup trên toàn hệ thống

### Kết quả kiểm tra
Mình đã xác định còn 2 nhóm lỗi chính:

1. **Còn sót nhiều `AlertDialogAction` gắn với handler xóa/cập nhật/import/disconnect**
   - Search hiện vẫn ra nhiều điểm còn lại ở:
     - `src/components/TaskListView.tsx`
     - `src/components/TaskNotes.tsx`
     - `src/components/KanbanBoard.tsx`
     - `src/components/StageManagement.tsx`
     - `src/components/ProjectActivityLog.tsx`
     - `src/components/SystemErrorLogs.tsx`
     - `src/components/communication/MessageItem.tsx`
     - `src/components/canvas/CanvasSidebar.tsx`
     - `src/components/notifications/GmailConnect.tsx`
     - `src/components/ExcelMemberImport.tsx`
     - `src/pages/AdminActivity.tsx`
     - `src/pages/MemberManagement.tsx`
     - `src/pages/WorkspaceSettings.tsx`
   - Đây vẫn là đúng pattern đã từng gây freeze: `AlertDialogAction` tự close, trong khi handler còn đổi state/xóa dữ liệu/rerender.

2. **Trang dự án còn lỗi nested popup trong `ResourceTagTextarea`**
   - `src/components/ResourceTagTextarea.tsx` đang mở `Dialog` bên trong dialog task.
   - File này hiện có:
     - `onPointerDownOutside={(e) => e.stopPropagation()}`
     - `onInteractOutside={(e) => e.stopPropagation()}`
   - Với popup lồng popup, cách này rất dễ làm dismiss layer/focus trap bị kẹt sau khi đóng.
   - Console hiện cũng đang báo warning từ `ResourceTagTextarea`, nên đây là điểm cần sửa cùng lúc.

### Cách sửa
1. **Quét và thay toàn bộ confirm action không an toàn**
   - Đổi các `AlertDialogAction` đang gọi handler stateful/async sang `Button`.
   - Chỉ đóng dialog bằng state sau khi flow xử lý hoàn tất.
   - Chuẩn hóa `onOpenChange` để chỉ reset state khi `open === false`.

2. **Sửa popup lồng trong trang dự án**
   - `src/components/ResourceTagTextarea.tsx`
     - bỏ `stopPropagation()` ở các handler outside interaction
     - chuyển inner picker sang flow an toàn cho dialog lồng:
       - ưu tiên `modal={false}` cho popup con hoặc đổi sang panel/popover nội bộ nếu cần
       - thêm `onCloseAutoFocus={(e) => e.preventDefault()}` rồi tự focus lại textarea
     - giữ logic restore cursor nhưng tránh race với focus restore của Radix
   - Kiểm tra cả nơi dùng:
     - `src/components/TaskEditDialog.tsx`
     - `src/pages/GroupDetail.tsx`

3. **Dọn warning ref/focus**
   - Xử lý luôn warning “Function components cannot be given refs” trong nhánh `ResourceTagTextarea` để tránh lỗi focus trap âm thầm khi popup mở/đóng.

4. **Smoke test toàn hệ thống**
   - Trang dự án: tạo task, sửa task, mở picker tài nguyên, đóng bằng X / click ngoài / ESC / Hủy / Xác nhận
   - Task & notes: xóa task, xóa note, đổi stage
   - Canvas: xóa page
   - Member/admin/workspace: xóa, bulk action, import, disconnect, delete workspace
   - Xác nhận không còn overlay bị kẹt hoặc web mất khả năng click

### File dự kiến chỉnh
- `src/components/ResourceTagTextarea.tsx`
- `src/components/TaskEditDialog.tsx`
- `src/pages/GroupDetail.tsx`
- `src/components/TaskListView.tsx`
- `src/components/TaskNotes.tsx`
- `src/components/KanbanBoard.tsx`
- `src/components/StageManagement.tsx`
- `src/components/ProjectActivityLog.tsx`
- `src/components/SystemErrorLogs.tsx`
- `src/components/communication/MessageItem.tsx`
- `src/components/canvas/CanvasSidebar.tsx`
- `src/components/notifications/GmailConnect.tsx`
- `src/components/ExcelMemberImport.tsx`
- `src/pages/AdminActivity.tsx`
- `src/pages/MemberManagement.tsx`
- `src/pages/WorkspaceSettings.tsx`

### Kết quả mong đợi
- Đóng popup bằng X, Hủy, click ngoài hoặc sau khi xác nhận sẽ không còn treo web
- Không còn lớp overlay/focus trap bị kẹt
- Popup trong trang dự án ổn định kể cả popup lồng popup
- Console không còn warning liên quan `ResourceTagTextarea` khi mở popup task</final-text>