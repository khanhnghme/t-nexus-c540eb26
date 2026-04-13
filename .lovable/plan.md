

## Plan: Thêm chỉnh sửa tên project cho trang /pa (Custom Mode)

### Vấn đề
Trang `/pa` (custom mode) không có tab Overview → không có cách nào để đổi tên project hoặc chỉnh thông tin project. User muốn có thể đổi tên mà không chiếm thêm diện tích.

### Giải pháp
Thêm khả năng **click vào tên project trên TopBar** để đổi tên inline — không cần thêm UI hay tab mới.

### Changes

**File 1: `src/components/layout/TopBar.tsx`**
- Trong block custom mode, biến tên project từ text tĩnh thành **inline editable**: click vào tên → biến thành input, Enter/blur để lưu, Escape để hủy
- Chỉ cho phép edit khi `isLeaderInGroup` = true (phó nhóm trở lên)
- Thành viên thường vẫn chỉ thấy text tĩnh

**File 2: `src/pages/GroupDetail.tsx`**
- Truyền thêm callback `onRenameProject` vào TopBar props (hoặc qua context) để cập nhật tên project vào database
- Tái sử dụng logic update group name đã có (supabase update `groups` table)
- Thêm `GroupInfoCard` dialog cho custom mode trong settings tab — khi leader muốn chỉnh thêm thông tin khác (mô tả, mã lớp, giảng viên...) thì vào tab Settings

### Technical Details
- TopBar: dùng state `isRenaming` + controlled input, blur/Enter triggers `onRenameProject(newName)`
- `onRenameProject` gọi `supabase.from('groups').update({ name }).eq('id', groupId)` rồi `fetchGroupData()`
- Trong settings tab (đã có cho custom mode), thêm `GroupInfoCard` để chỉnh đầy đủ thông tin project

