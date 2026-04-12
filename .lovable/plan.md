

## Thêm chức năng chọn file từ Google Drive vào trang /pa (Canvas) — Cập nhật

### Thay đổi so với plan trước
- **KHÔNG** hiển thị nút kết nối/ngắt kết nối Google Drive trên trang /pa
- Nếu chưa kết nối Drive → hiện thông báo và **điều hướng sang trang Cài đặt** (`/settings#integrations`)
- Nếu đã kết nối → mở Google Picker bình thường

### Thay đổi

| File | Nội dung |
|------|----------|
| **`src/components/canvas/CanvasPageView.tsx`** | Thêm nút Drive vào toolbar (chỉ khi `isEditMode`). Dùng `useGoogleDriveConnect` để kiểm tra trạng thái. Nếu chưa kết nối → `toast` thông báo + `navigate('/settings#integrations')`. Nếu đã kết nối → mở Picker, chèn file vào editor |
| **`src/components/canvas/CanvasEditor.tsx`** | Expose method `insertDriveFiles` qua ref để chèn link block từ bên ngoài |

### Chi tiết

**CanvasPageView.tsx — Nút Drive trên toolbar:**
- Import `useGoogleDriveConnect`, `useGoogleDrivePicker`
- Khi click nút Drive:
  - Nếu `!isConnected` → `toast("Vui lòng kết nối Google Drive trong Cài đặt")` + `navigate('/settings#integrations')` → return
  - Nếu `isConnected` → gọi `openPicker()`, khi chọn file xong → `editorRef.current?.insertDriveFiles(files)`
- Không có UI kết nối/ngắt kết nối tại đây

**CanvasEditor.tsx — insertDriveFiles:**
- Thêm method `insertDriveFiles(files)` vào `CanvasEditorHandle`
- Mỗi file → chèn 1 paragraph block chứa link: `📎 {file.title}` → `file.url`

