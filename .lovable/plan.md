

## Phân tích: Chế độ Read-only — Thiếu sót hiện tại

### Những gì ĐÃ CÓ
1. **Hook `useAccountReadOnly`**: Phát hiện trạng thái read-only (Free + vượt hạn mức) + tính grace period từ `downgraded_at`
2. **Banner `ReadOnlyBanner`**: Hiển thị cảnh báo trên dashboard, có nút "Dọn dẹp" và "Nâng cấp"
3. **Cột `downgraded_at`** trên bảng `profiles`: Đã có trong DB

---

### Những gì THIẾU (7 vấn đề)

#### A. Không có enforcement thực tế — chỉ có banner
`useAccountReadOnly` chỉ được dùng ở **1 chỗ duy nhất**: `ReadOnlyBanner.tsx`. Không có component/page nào thực sự **block** hành động khi `isReadOnly = true`.

Cụ thể, các hành động sau **KHÔNG bị chặn** khi read-only:
- Tạo project mới (`Groups.tsx` — chỉ check limit, không check read-only)
- Chỉnh sửa task, tạo task mới
- Upload file / tài liệu
- Chỉnh sửa thông tin project
- Mời thành viên
- Tạo cuộc họp, gửi tin nhắn

#### B. `downgraded_at` không bao giờ được ghi
Không có logic nào **tự động set `downgraded_at`** khi user downgrade từ gói trả phí về Free. Cột này luôn là `null`, nghĩa là grace period **luôn = null** và countdown 30 ngày không bao giờ hoạt động.

#### C. Không có cron/edge function Hard Delete (ngày thứ 31)
Tài liệu /guide/pricing Chương 2, mục 2.3 quy định: sau 30 ngày grace period, hệ thống tự động xóa dữ liệu dư thừa. Hiện tại **không có** edge function `check-grace-period` hay bất kỳ scheduled job nào.

#### D. `isOverLimits` so sánh với plan hiện tại, không phải plan Free
Hook `useAccountLimitsCheck` fetch limits theo `profile.user_plan` (plan hiện tại). Nếu user đang trên gói Plus mà vượt hạn mức Plus, `isOverLimits = true` nhưng `isFree = false` → read-only sẽ không bật. Đúng.

Nhưng nếu user **vừa downgrade** về Free, logic hiện tại đã đúng vì plan = `plan_free` và limits = limits của Free. **Đây OK.**

#### E. Typo trong code
`downgradadedAt` → nên là `downgradedAt` (typo nhỏ nhưng ảnh hưởng readability).

#### F. `(profile as any)?.downgraded_at` — bypass type
`downgraded_at` đã có trong types.ts nhưng hook vẫn dùng `as any`. Có thể truy cập trực tiếp `profile?.downgraded_at`.

#### G. Banner chỉ hiển thị ở DashboardLayout
`ReadOnlyBanner` chỉ render trong `DashboardLayout.tsx`. Các trang nằm ngoài layout này (nếu có) sẽ không thấy banner.

---

### Kế hoạch triển khai hoàn thiện

#### Bước 1: Enforcement thực tế
- Tạo một guard component hoặc sử dụng `useAccountReadOnly` tại các điểm tạo/sửa:
  - `Groups.tsx`: Block tạo project nếu `isReadOnly`
  - Task creation/editing components
  - File upload components
  - Member invitation flows
  - Meeting creation
  - Project settings editing
- Hoặc tạo wrapper component `<ReadOnlyGuard>` hiển thị toast + block action

#### Bước 2: Tự động ghi `downgraded_at`
- Tạo database trigger trên bảng `profiles`: khi `user_plan` thay đổi từ gói trả phí → `plan_free`, tự động set `downgraded_at = now()`
- Khi `user_plan` thay đổi từ `plan_free` → gói trả phí, tự động clear `downgraded_at = null`

#### Bước 3: Edge function `check-grace-period` (Hard Delete)
- Tạo scheduled edge function chạy hàng ngày
- Quét profiles có `downgraded_at` > 30 ngày + `user_plan = plan_free` + vượt hạn mức
- Xóa dữ liệu dư thừa theo nguyên tắc "giữ cũ nhất"

#### Bước 4: Fix code quality
- Sửa typo `downgradadedAt` → `downgradedAt`
- Bỏ `as any`, dùng `profile?.downgraded_at` trực tiếp

### Files cần sửa/tạo

| File | Hành động |
|------|-----------|
| `src/hooks/useAccountReadOnly.ts` | Fix typo, bỏ `as any` |
| `src/pages/Groups.tsx` | Thêm check `isReadOnly` block tạo project |
| Các component tạo/sửa task, upload, invite | Thêm check `isReadOnly` |
| `supabase/migrations/` | Trigger tự động ghi `downgraded_at` |
| `supabase/functions/check-grace-period/` | Tạo mới — cron hard delete |

