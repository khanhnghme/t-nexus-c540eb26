

## Fix: Mã đơn hàng hiển thị sai tại Billing History

### Nguyên nhân

Trang `/billing-history` hiển thị 2 loại records:
1. **Payment records** (từ `payment_history`): `raw` là row payment — **không có `order_code`**, chỉ có `order_id` (UUID). Nên fallback hiển thị `#AB12CD34` (8 ký tự UUID cắt ngắn).
2. **Pending orders** (từ `orders`): `raw` là row order — **có `order_code`** (`ORD-YYYYMM-XXX`). Hiển thị đúng.

### Giải pháp

Sau khi load cả 2 nguồn dữ liệu, tạo một map `orderId → order_code` từ `orders` data, rồi gắn `order_code` vào mỗi payment record thông qua `order_id`.

### Thay đổi

**File: `src/pages/BillingHistory.tsx`**

1. Tạo map `orderCodeMap` từ `orderRes.data`:
```typescript
const orderCodeMap: Record<string, string> = {};
(orderRes.data || []).forEach((o: any) => {
  if (o.id && o.order_code) orderCodeMap[o.id] = o.order_code;
});
```

2. Khi map `paymentRecords`, gắn `order_code` vào raw:
```typescript
raw: { ...r, order_code: r.order_id ? orderCodeMap[r.order_id] : undefined },
```

3. Bỏ fallback UUID cắt ngắn — chỉ hiển thị `order_code` hoặc `'—'`:
```typescript
{row.raw?.order_code || '—'}
```

### Kết quả

Tất cả records (payment lẫn pending) đều hiển thị mã đơn chuẩn `ORD-YYYYMM-XXXXXXXXX`.

