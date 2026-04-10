
Đã xác định đúng lỗi gốc: frontend đang theo dõi 1 order, còn backend lại hoàn tất 1 order khác, nên step 2 không thể tự qua step 3 dù đã báo “thanh toán thành công”.

```text
Step 1 tạo reservation:      Order A (order_code hiện tại)
Step 2 poll theo route:      luôn đọc Order A
create-paypal-order hiện tại tạo thêm: Order B
capture/webhook hoàn tất:    Order B
summary/payment page đọc:    Order A vẫn pending
=> bị kẹt ở step 2 hoặc bị bật ngược từ summary về payment
```

Nguyên nhân chính đã thấy trong code:
- `src/pages/CheckoutPayment.tsx` chỉ tự chuyển step khi order theo `order_code` hiện tại chuyển `completed`
- `src/pages/CheckoutSummary.tsx` thấy `pending` thì lập tức redirect ngược về step 2
- `supabase/functions/create-paypal-order/index.ts` đang bỏ qua `internal_order_id` và luôn `insert` order mới
- log/network cho thấy order hiện tại vẫn `pending`, nhưng profile đã `active`, và `paypal_subscription_id` giữa profile và order đang mở không khớp

Kế hoạch fix

1. Sửa backend để 1 phiên checkout chỉ dùng 1 order
- File: `supabase/functions/create-paypal-order/index.ts`
- Nếu có `internal_order_id`:
  - lấy đúng order pending của user
  - update chính row đó thay vì insert row mới
  - ghi `paypal_subscription_id`, amount, coupon, addons theo tính toán backend
  - reset các cờ xử lý sau thanh toán: `addons_applied = false`, `coupon_applied = false`
- Chỉ insert order mới cho flow không có reservation trước, như onboarding

2. Sửa reservation hiện tại đang set sai idempotency flags
- File: `src/pages/Checkout.tsx`
- File: `src/pages/AddonCheckout.tsx`
- Khi tạo reservation ban đầu, không được set `addons_applied: true` hoặc `coupon_applied: true`
- Các cờ này chỉ được bật sau khi capture/webhook đã áp dụng tài nguyên thực sự

3. Giữ step 2 luôn bám đúng order hiện tại
- File: `src/pages/CheckoutPayment.tsx`
- File: `src/pages/AddonCheckoutPayment.tsx`
- Giữ polling trên đúng `order_code` đang mở
- Sau khi capture thành công, có thể refetch order hiện tại trước khi navigate để tránh race ngắn
- Bỏ false-error từ PayPal `"Detected popup close"` trong `onError`, vì popup đóng sau approve không nên bị coi là thanh toán lỗi

4. Không cho summary bật ngược quá sớm
- File: `src/pages/CheckoutSummary.tsx`
- Nếu order vẫn `pending`, không redirect ngược ngay
- Hiển thị trạng thái “đang đồng bộ thanh toán” và poll ngắn
- Chỉ quay lại step 2 nếu quá timeout hoặc order thật sự chưa hoàn tất

5. Đồng bộ các flow cũ để không còn route kết quả lệch chuẩn
- File: `src/pages/Checkout.tsx`
- File: `src/pages/AddonCheckout.tsx`
- File: `src/pages/PaymentResult.tsx`
- Rà lại logic cũ `/checkout/result` để tất cả flow cuối cùng đều resolve về `/checkout/summary/:orderCode`
- Giữ onboarding tương thích với backend mới nhưng không làm phát sinh duplicate order

Kiểm tra sau khi triển khai
- Thanh toán plan ở `/checkout/payment/:orderCode` phải tự sang `/checkout/summary/:orderCode`
- Thanh toán add-on ở `/addon-checkout/:orderCode` phải tự sang summary
- Billing history phải mở đúng summary của chính order vừa thanh toán
- Không còn trường hợp profile đã active nhưng order đang mở vẫn `pending`
- Không còn toast/log lỗi giả từ `"Detected popup close"`

Chi tiết kỹ thuật cần giữ
- `internal_order_id` phải trở thành khóa liên kết thật giữa step 1 và step 2
- backend phải là nguồn dữ liệu cuối cùng cho amount/coupon/addons, nhưng phải update vào chính reservation row
- `addons_applied` / `coupon_applied` là cờ hậu xử lý, không phải cờ “order có addon/coupon”
