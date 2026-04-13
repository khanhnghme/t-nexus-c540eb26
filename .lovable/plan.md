

## Cập nhật điều hướng sau thanh toán tại trang Summary

### Vấn đề
Hiện tại, khi thanh toán thành công, nút CTA mặc định luôn dẫn về `/dashboard`. Cần điều hướng thông minh hơn dựa vào loại đơn hàng (`order_type`).

### Thay đổi — `src/pages/CheckoutSummary.tsx`

Cập nhật logic nút CTA khi `status === 'completed'` (dòng 381–402):

| Trường hợp | Hiện tại | Sau khi sửa |
|---|---|---|
| `checkout_from === 'onboarding'` | → `/onboarding` | Giữ nguyên |
| `checkout_from === 'billing'` | → `/billing-history` | Giữ nguyên |
| `order_type === 'addon'` | → `/dashboard` ❌ | → `/service-plan?tab=addon` (trang quản lý add-on) |
| `order_type === 'plan'` (mua/nâng cấp gói) | → `/dashboard` | → `/service-plan` (trang gói dịch vụ) |
| Mặc định fallback | → `/dashboard` | → `/service-plan` |

Cụ thể thay đổi block default (khi không có `checkout_from`):
- Nếu `order.order_type === 'addon'` → navigate `/service-plan?tab=addon`, label: "Xem gói bổ sung" / "View Add-ons"
- Ngược lại → navigate `/service-plan`, label: "Xem gói dịch vụ" / "View Service Plan"

Tương tự cập nhật nút `failed` cho addon: nút retry dẫn về `/addon-checkout/payment/${orderCode}` thay vì `/checkout/payment/${orderCode}` (kiểm tra `order.order_type`).

