

## Plan: Thêm upload ảnh vào góp ý + email support

### Yêu cầu từ user
- Không dùng bucket `system-assets`, cần tạo bucket riêng
- Tối đa 5MB/file
- Thêm email support

### Bucket cần tạo
Bạn cần tạo **1 bucket mới**: `feedback-attachments` (public)

Sau khi bạn tạo xong bucket, mình sẽ:

### Thay đổi

**1. Migration**: Thêm cột `attachments jsonb DEFAULT '[]'` vào bảng `feedbacks`

**2. Cập nhật R2 config**:
- Thêm `feedback-attachments` vào `ALLOWED_BUCKETS` và `BUCKET_URL_KEYS` trong `supabase/functions/r2-storage/index.ts`
- Thêm vào `ALL_BUCKETS` trong `src/lib/r2Storage.ts`
- Bạn cần set secret `R2_URL_FEEDBACK_ATTACHMENTS` với public URL của bucket

**3. Sửa `src/pages/Feedback.tsx`**:
- Thêm UI chọn ảnh (chỉ image/*, max 5MB/file, tối đa 3 ảnh)
- Preview thumbnails + xóa từng ảnh
- Upload lên R2 bucket `feedback-attachments` path `{userId}/{timestamp}-{filename}`
- Hiển thị ảnh đính kèm trong danh sách góp ý (cả user và admin)
- Thêm thông tin email support `support@t-nexus.io.vn` với icon Mail

### Tổng: 1 migration + 3 file sửa + 1 secret mới (`R2_URL_FEEDBACK_ATTACHMENTS`)

