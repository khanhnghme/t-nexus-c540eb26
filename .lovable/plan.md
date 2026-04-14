

## Plan: Fix dialog freeze + xóa phương thức nộp & giới hạn file khỏi TaskEditDialog

### Vấn đề 1: Web bị đứng khi chọn giai đoạn trong dialog
Nguyên nhân: Radix Select bên trong Radix Dialog tạo xung đột focus trap. Khi Select đóng lại, Dialog cố gắng bắt focus nhưng Select portal cũng đang xử lý — gây đứng.

**Fix**: Thêm `modal={false}` vào tất cả `<Select>` trong TaskEditDialog (giai đoạn, cách nộp) để tránh xung đột focus. Đồng thời thêm `onCloseAutoFocus={(e) => e.preventDefault()}` vào DialogContent.

### Vấn đề 2: Xóa phương thức nộp & giới hạn file
Xóa 2 cột "Cách nộp" và "Giới hạn" khỏi form chỉnh sửa task.

### Chi tiết kỹ thuật

**File: `src/components/TaskEditDialog.tsx`**

1. **Fix freeze**: Thêm `onCloseAutoFocus={(e) => e.preventDefault()}` vào `<DialogContent>` (line 303)

2. **Xóa UI**: Xóa 2 cột cuối trong grid config row (lines 385-413) — "Cách nộp" (Select submission method) và "Giới hạn" (FileSizeLimitSelector)

3. **Đổi grid**: `grid-cols-[1fr_1.2fr_1fr_1fr]` → `grid-cols-2` (chỉ còn Giai đoạn + Deadline)

4. **Giữ nguyên state & logic save**: `submissionMethod` và `maxFileSize` vẫn giữ trong state và gửi khi save (giữ backward compatibility), chỉ xóa khỏi UI

5. **Xóa import không dùng**: `Send` icon, `FileSizeLimitSelector` import (nếu không dùng ở chỗ khác)

6. **Xóa phần read-only display** cho 2 field đó (lines 398-412)

### Tổng: 1 file sửa

