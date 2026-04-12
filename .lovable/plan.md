

## Áp dụng giới hạn file size theo gói cước cho mọi upload tại /pa

### Vấn đề
- **CoverPicker**: Hardcode giới hạn 5MB, không theo gói cước
- **CanvasEditor** (upload file trong editor): Chỉ dựa vào server trả lỗi 413, không kiểm tra trước ở client → UX chậm

### Giải pháp
Thêm `maxFileSizeMb` prop vào CoverPicker và kiểm tra client-side trong CanvasEditor, lấy từ `useAccountLimitsCheck().maxFileSizeMb`.

### Thay đổi

| File | Nội dung |
|------|----------|
| **`src/components/canvas/CoverPicker.tsx`** | Nhận prop `maxFileSizeMb`, dùng thay cho hardcode 5MB |
| **`src/components/canvas/CanvasEditor.tsx`** | Gọi `useAccountLimitsCheck()`, truyền `maxFileSizeMb` xuống CoverPicker và check trước khi upload file trong editor |
| **`src/components/canvas/PageHeader.tsx`** | Truyền `maxFileSizeMb` xuống CoverPicker |
| **`src/components/canvas/PageCoverImage.tsx`** | Truyền `maxFileSizeMb` xuống CoverPicker |

### Chi tiết

**CoverPicker.tsx:**
- Thêm prop `maxFileSizeMb?: number` (default 5)
- Thay `MAX_FILE_SIZE = 5 * 1024 * 1024` bằng tính từ prop
- Thông báo lỗi hiển thị đúng giới hạn: "File ảnh không được vượt quá {X}MB"

**CanvasEditor.tsx:**
- Import `useAccountLimitsCheck`
- Trong `uploadFile`, thêm check `file.size > maxFileSizeMb * 1024 * 1024` trước khi gọi R2
- Truyền `maxFileSizeMb` xuống PageHeader và PageCoverImage

**PageHeader.tsx & PageCoverImage.tsx:**
- Nhận và truyền `maxFileSizeMb` xuống CoverPicker

