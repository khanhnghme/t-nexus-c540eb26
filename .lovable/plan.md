

## Plan: Đổi trang Góp ý thành Contact Form riêng tư + Admin lọc theo plan

### Tổng quan
Viết lại toàn bộ `src/pages/Feedback.tsx` thành giao diện đơn giản:
- **User thường**: Chỉ thấy form gửi góp ý (tiêu đề, loại, nội dung) + danh sách góp ý **của chính mình** kèm trạng thái và phản hồi từ admin
- **Admin/Owner**: Thấy tất cả góp ý từ mọi user, có thể lọc theo **gói plan** (Free/Plus/Pro/Business), trạng thái (pending/reviewed/resolved), và phản hồi trực tiếp

### Chi tiết kỹ thuật

**File: `src/pages/Feedback.tsx`** — viết lại hoàn toàn

1. **Giao diện User**:
   - Form gửi: Tiêu đề, Loại (bug/suggestion/other), Nội dung — gửi vào bảng `feedbacks` (đã có)
   - Danh sách góp ý của mình: hiển thị trạng thái (pending/reviewed/resolved), phản hồi admin nếu có
   - Không hiển thị góp ý của người khác

2. **Giao diện Admin/Owner**:
   - Tab "Tất cả góp ý": danh sách tất cả feedback
   - Bộ lọc: theo **plan** (user_plan từ profiles), theo **trạng thái** (status), theo **loại** (type)
   - Mỗi góp ý hiển thị thông tin user + plan badge
   - Admin có thể phản hồi (cập nhật `admin_response`, `responded_at`, `responded_by`) và đổi trạng thái
   - Tab "Log lỗi" giữ nguyên cho admin

3. **Xóa hoàn toàn**: reactions, comments, reply, expand — không dùng nữa (bảng DB giữ nguyên, chỉ xóa khỏi UI)

4. **Query data**: Join `feedbacks` với `profiles` để lấy `user_plan`, hiển thị badge plan bên cạnh tên user

### Không cần migration
Bảng `feedbacks` đã có sẵn các cột cần thiết: `status`, `type`, `priority`, `admin_response`, `responded_at`, `responded_by`. RLS đã cho phép admin xem tất cả, user xem của mình.

### Tổng: 1 file viết lại

