

## Kế hoạch triển khai Giai đoạn 4-6: Đã hoàn thành gần hết — chỉ còn dọn dẹp nhỏ

### Đánh giá hiện trạng

Sau khi rà soát code hiện tại, **hầu hết giai đoạn 4-6 đã được triển khai** trong lần commit trước (cùng với giai đoạn 1-3):

| Mục | Trạng thái |
|-----|-----------|
| **4. Login** — chỉ chấp nhận Email | ✅ Đã xong |
| **4. Login** — label "Email", icon Mail | ✅ Đã xong |
| **4. Login** — bỏ MSSV lookup logic | ✅ Đã xong |
| **5. Register** — studentId optional trong schema | ✅ Đã xong |
| **5. Register** — bỏ pre-check trùng MSSV | ✅ Đã xong |
| **5. Register** — bỏ dấu `*` trên student_id label | ✅ Đã xong |
| **6. Forgot Password** — chỉ cần email | ✅ Đã xong |
| **6. Forgot Password** — gửi OTP trực tiếp bằng email | ✅ Đã xong |
| **6. Forgot Password** — bỏ field MSSV | ✅ Đã xong |

### Còn lại: Dọn dẹp nhỏ (2 thay đổi)

#### 1. `src/components/MemberAuthForm.tsx` — Xóa state không dùng

- **Xóa `forgotIdentifier` state** (line 130): `useState('')` — không còn được sử dụng ở bất kỳ đâu trong logic, chỉ được reset trong `setForgotIdentifier('')` (line 872). Xóa cả state declaration và tất cả references.

#### 2. `src/components/MemberAuthForm.tsx` — Xóa `Hash` import nếu không cần

- `Hash` icon hiện chỉ dùng cho field student_id trong form đăng ký (line 1171). Đây là hợp lệ (hiển thị icon cho field MSSV). **Giữ nguyên** — không cần xóa.

### Kết luận

Chỉ cần **1 thay đổi nhỏ**: xóa state `forgotIdentifier` không còn sử dụng trong `MemberAuthForm.tsx`. Toàn bộ logic chính của giai đoạn 4-6 đã hoạt động đúng.

