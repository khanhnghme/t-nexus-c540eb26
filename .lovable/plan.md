

## Plan: Cập nhật flow thanh toán & tách trang lịch sử

### Tổng quan
5 thay đổi chính: (1) popup xác nhận chính sách trước Step 2, (2) chặn back từ Step 2 về Step 1, (3) tạo trang Billing History riêng, (4) nâng cấp bảng lịch sử thanh toán với filter/status/nút tiếp tục thanh toán, (5) thêm nav item trong sidebar.

### Chi tiết

#### 1. Popup xác nhận chính sách (Checkout.tsx + AddonCheckout.tsx)
- Khi bấm "Continue to Pay" ở Step 1, thay vì `setStep(2)` trực tiếp → mở Dialog xác nhận
- Dialog chứa: checkbox "Tôi đã đọc và đồng ý với Điều khoản dịch vụ và Chính sách bảo mật" (link mở tab mới bằng `target="_blank"`)
- Nút "Tiếp tục thanh toán" chỉ enabled khi checkbox được tick
- Khi bấm tiếp tục → `setStep(2)` + đóng dialog

#### 2. Chặn back từ Step 2 về Step 1 (Checkout.tsx + AddonCheckout.tsx)
- Step 2: xóa nút back (ArrowLeft) hoàn toàn — hiện tại dòng 552 trong Checkout.tsx cho phép `setStep(1)`
- Đơn hàng đã tạo khi vào Step 2 (tạo qua `createOrder` của PayPal) nên không cho quay lại thay đổi config
- Tương tự cho AddonCheckout.tsx

#### 3. Tạo trang Billing History (`src/pages/BillingHistory.tsx`)
- Di chuyển toàn bộ tab "billing" từ ServicePlan.tsx sang trang riêng
- Bổ sung cột: trạng thái chi tiết (pending/completed/expired/cancelled/failed), thời gian thanh toán (`paid_at`), mã đơn hàng (`order_id`), phương thức thanh toán
- Thêm filter tabs: Tất cả / Hoàn tất / Đang chờ / Hết hạn
- Với đơn pending còn hiệu lực (`expires_at > now()`): hiển thị nút "Tiếp tục thanh toán" → navigate đến `/checkout?resume=orderId`
- Join data từ cả `payment_history` + `orders` table (orders cho pending, payment_history cho completed)

#### 4. Cập nhật ServicePlan.tsx
- Xóa tab "billing" khỏi TabsList
- Xóa toàn bộ `<TabsContent value="billing">` section
- Xóa state/effect liên quan (`billingHistory`, `billingLoading`, `selectedPayment`)

#### 5. Sidebar + Routes
- **SidebarTreeNav.tsx**: Chuyển item "Service Plan" thành nhóm có 2 child: "Gói dịch vụ" (`/service-plan`) + "Lịch sử thanh toán" (`/billing-history`)
- **App.tsx**: Thêm route `/billing-history` trong ProtectedLayout

### Status badge mapping
| Status | Label (EN/VI) | Color |
|--------|--------------|-------|
| `completed` | Paid / Đã thanh toán | emerald |
| `pending` | Pending / Đang chờ | amber |
| `expired` | Expired / Hết hạn | gray |
| `cancelled` | Cancelled / Đã hủy | red |
| `failed` | Failed / Thất bại | destructive |

### Files

| File | Action |
|---|---|
| `src/pages/BillingHistory.tsx` | Create — trang lịch sử thanh toán riêng |
| `src/pages/Checkout.tsx` | Edit — thêm confirmation dialog, xóa back button Step 2 |
| `src/pages/AddonCheckout.tsx` | Edit — thêm confirmation dialog, xóa back button Step 2 |
| `src/pages/ServicePlan.tsx` | Edit — xóa tab billing + related state |
| `src/components/SidebarTreeNav.tsx` | Edit — nhóm nav cho Service Plan + Billing History |
| `src/App.tsx` | Edit — thêm route `/billing-history` |

