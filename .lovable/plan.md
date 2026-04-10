

## Plan: Nâng cấp UI Lịch sử thanh toán & cho phép tiếp tục mua

### Tóm tắt
Cải thiện tab "Billing History" trong ServicePlan.tsx từ bảng đơn giản thành UI card-based trực quan hơn, thêm nút hành động "Mua lại" / "Nâng cấp" trên mỗi giao dịch.

### Thay đổi cụ thể

#### 1. Redesign Billing History Tab (ServicePlan.tsx)
- **Thay bảng HTML bằng card timeline** — mỗi giao dịch là 1 card hiển thị:
  - Icon trạng thái (CheckCircle2 xanh cho Paid, Clock vàng cho Pending, XCircle đỏ cho Failed, AlertTriangle cho Expired)
  - Tên gói + Badge trạng thái
  - Số tiền lớn, nổi bật
  - Ngày thanh toán + mã giao dịch (font-mono, nhỏ)
  - Phương thức thanh toán + mã coupon nếu có
- **Thêm nút hành động trên mỗi giao dịch**:
  - "Mua lại gói này" → navigate tới `/checkout?plan=xxx&cycle=xxx` (re-purchase cùng gói)
  - "Nâng cấp" → navigate tới `/upgrade?from=personal`
  - Chỉ hiển thị khi giao dịch đã hoàn thành (status = completed)
- **Giữ nguyên** click vào card mở `UserPaymentDetailDialog`
- **Thêm empty state** đẹp hơn với icon Receipt + CTA "Bắt đầu mua gói"

#### 2. Cải thiện PaymentResult.tsx
- Thêm nút "Tiếp tục mua thêm Add-on" bên cạnh "View Your Plan" khi thanh toán thành công
- Thêm confetti animation nhẹ (CSS keyframes) cho trạng thái thành công

### Files sửa
| File | Action |
|---|---|
| `src/pages/ServicePlan.tsx` | Edit — redesign billing tab từ table → cards + action buttons |
| `src/pages/PaymentResult.tsx` | Edit — thêm nút "Mua thêm Add-on" |

### Không thay đổi
- Logic, API, database
- Các tab khác trong ServicePlan
- UserPaymentDetailDialog

