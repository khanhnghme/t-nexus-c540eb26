

## Plan: Bảo vệ trang Summary + điều hướng sau đăng nhập từ QR

### Vấn đề hiện tại
- `CheckoutSummary` nằm trong `ProtectedRoute` → chưa đăng nhập sẽ bị redirect `/login` mất URL
- Query filter `user_id = user.id` → chỉ chủ đơn xem được, nhưng system:owner/admin cũng cần xem
- Không có cơ chế lưu URL để quay lại sau login

### Giải pháp

#### 1. Tách route Summary ra khỏi ProtectedRoute (`App.tsx`)
- Tạo route riêng cho `/checkout/summary/:orderCode` và `/addon-checkout/summary/:orderCode` **ngoài** `ProtectedRoute`
- Dùng layout minimal (không cần CheckoutLayoutWrapper phức tạp)

#### 2. Xử lý auth + redirect trong `CheckoutSummary.tsx`
- Nếu **chưa đăng nhập**: lưu URL hiện tại vào `sessionStorage` key `t-nexus_post_login_redirect`, hiển thị UI yêu cầu đăng nhập với nút "Đăng nhập" (giống JoinProject)
- Nếu **đã đăng nhập**: kiểm tra quyền:
  - Chủ đơn hàng (`order.user_id === user.id`) → cho xem
  - `system:owner` hoặc `system:admin` (query `user_roles`) → cho xem
  - Khác → hiển thị trang 403 Access Denied
- Bỏ filter `.eq('user_id', user.id)` trong query, thay bằng chỉ filter `order_code`, rồi kiểm tra quyền sau khi fetch

#### 3. Logic đăng nhập quay lại (đã có sẵn)
- `LoginForm.tsx` và `RememberLoginScreen.tsx` đã đọc `t-nexus_post_login_redirect` → tự động redirect về đúng trang summary sau login

### Files thay đổi
- `src/App.tsx` — tách 2 route summary ra ngoài ProtectedRoute
- `src/pages/CheckoutSummary.tsx` — thêm logic auth guard, redirect, access control, 403

