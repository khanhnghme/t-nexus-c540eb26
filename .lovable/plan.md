

## Plan: Order Reservation Model — Giữ đơn có thời hạn

### Hiện trạng

Hệ thống đã có 80% mô hình này:
- Order tạo với `status = pending` khi gọi `create-paypal-order`
- `cleanup-pending-orders` tự hủy đơn pending sau 2h (dùng `created_at`)
- `capture-paypal-order` check idempotent (`completed` → skip)

### Thiếu sót cần bổ sung

| Lỗ hổng | Vấn đề |
|---|---|
| Không có `expires_at` | Cleanup dùng `created_at + 2h` ngầm, nhưng capture không check → **đơn hết hạn vẫn có thể capture** |
| Capture không reject expired | Nếu cron chưa chạy và đơn quá 2h, capture vẫn xử lý bình thường |
| Frontend không biết đơn hết hạn | Không hiển thị countdown hoặc cảnh báo |

### Thay đổi

#### 1. DB Migration — Thêm cột `expires_at`
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at timestamptz;
-- Backfill existing pending orders
UPDATE orders SET expires_at = created_at + interval '2 hours' WHERE expires_at IS NULL;
```

#### 2. `create-paypal-order/index.ts`
- Set `expires_at = NOW() + 2 hours` khi insert order

#### 3. `capture-paypal-order/index.ts`
- Sau khi fetch order, thêm check:
  ```
  if (order.status === 'expired' || (order.expires_at && new Date(order.expires_at) < new Date()))
    → return 400 "Order expired"
  ```
- Nếu order đã quá hạn nhưng chưa bị cron đánh expired → set expired luôn và reject

#### 4. `cleanup-pending-orders/index.ts`
- Đổi điều kiện: dùng `expires_at <= NOW()` thay vì `created_at < 2h ago`

#### 5. `paypal-webhook/index.ts`
- Thêm check `expires_at` tương tự capture — reject webhook cho đơn hết hạn

### Không thay đổi
- Frontend flow (step 1/2) giữ nguyên
- Logic tính giá, coupon, addon giữ nguyên
- PayPal integration flow giữ nguyên

### Files

| File | Action |
|---|---|
| DB migration | Add `expires_at` column |
| `supabase/functions/create-paypal-order/index.ts` | Set `expires_at` on insert |
| `supabase/functions/capture-paypal-order/index.ts` | Reject expired orders |
| `supabase/functions/cleanup-pending-orders/index.ts` | Use `expires_at` column |
| `supabase/functions/paypal-webhook/index.ts` | Reject expired orders |

