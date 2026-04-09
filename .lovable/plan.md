

## Plan: Triển khai thanh toán Add-on mua thêm

### Tổng quan
Cho phép người dùng Premium mua thêm add-on (projects, storage, members) riêng lẻ mà không cần mua kèm gói plan. Flow: ServicePlan addon tab → chọn số lượng → thanh toán PayPal → cộng dồn add-on.

### Thay đổi cần thực hiện

#### 1. Database Migration
- Thêm cột `order_type` vào bảng `orders` (default `'plan'`, values: `'plan'` | `'addon'`)
- Cho phép cột `plan` nullable (vì addon-only order không cần plan)

#### 2. Edge Function: `create-paypal-order`
- Hỗ trợ thêm `order_type: 'addon'` từ request body
- Khi `order_type === 'addon'`: không yêu cầu `plan`, tính giá add-on dựa trên plan hiện tại của user (để áp dụng đúng % giảm giá), `base_amount = 0`
- Lưu order với `order_type = 'addon'`, plan = user's current plan

#### 3. Edge Function: `capture-paypal-order`
- Kiểm tra `order.order_type`:
  - Nếu `'addon'`: chỉ cập nhật `user_addons` + `payment_history` + `plan_change_logs`. **Không** thay đổi `profiles.user_plan` hay `plan_expires_at`
  - Nếu `'plan'` (default): giữ nguyên logic hiện tại

#### 4. Edge Function: `paypal-webhook`
- Tương tự capture: nếu `order.order_type === 'addon'`, skip profile/plan update, chỉ update addons + history

#### 5. Frontend: `ServicePlan.tsx` — Addon Tab
- Thay nút "Confirm Changes" bằng flow thanh toán thực:
  - Tính toán delta (số lượng mới - số lượng cũ trong DB) cho mỗi addon type
  - Nếu delta > 0: hiển thị tổng giá cho phần mua thêm + nút "Thanh toán"
  - Click "Thanh toán" → gọi `create-paypal-order` với `order_type: 'addon'`
  - Render PayPal button inline (giống Checkout)
  - Sau thanh toán thành công → refresh addons + toast thành công
- Nếu delta <= 0 hoặc không thay đổi: disable nút
- Hiển thị billing_cycle từ profile (monthly/yearly) để tính giá đúng

#### 6. Logic giá
- Giá gốc addon: $2.49/tháng/gói, $24.90/năm/gói
- Giảm giá theo plan hiện tại: Plus 10%, Pro 20%, Business 20%
- Billing cycle theo `profile.billing_cycle`

### Files cần sửa
- `supabase/functions/create-paypal-order/index.ts`
- `supabase/functions/capture-paypal-order/index.ts`
- `supabase/functions/paypal-webhook/index.ts`
- `src/pages/ServicePlan.tsx`
- Migration SQL (thêm `order_type` column)

