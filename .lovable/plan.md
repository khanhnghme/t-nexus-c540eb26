

## Plan: Chuẩn hóa mã đơn hàng `ORD-YYYYMM-XXXXXXXXX`

### Tổng quan
Thêm cột `order_code` vào bảng `orders`, tự động generate mã theo format `ORD-YYYYMM-XXXXXXXXX` khi tạo order. Hiển thị mã này thay vì UUID trên toàn hệ thống.

### Thay đổi

#### 1. Database Migration
- Thêm cột `order_code TEXT UNIQUE` vào bảng `orders`
- Tạo function `generate_order_code()` dùng PL/pgSQL:
  - Format: `ORD-YYYYMM-XXXXXXXXX` (9 ký tự A-Z, 0-9)
  - Loop kiểm tra trùng, generate lại nếu trùng
- Tạo trigger `BEFORE INSERT` gán `order_code` tự động
- Backfill các order cũ chưa có `order_code`

#### 2. Edge Function: `create-paypal-order/index.ts`
- Sau khi insert order, query lại `order_code` từ DB
- Trả về `order_code` trong response

#### 3. Frontend — Hiển thị `order_code` thay UUID

| File | Thay đổi |
|---|---|
| `src/pages/CheckoutPayment.tsx` | Hiển thị `order.order_code` thay vì `orderId.slice(0,8)` |
| `src/pages/AddonCheckoutPayment.tsx` | Tương tự |
| `src/pages/CheckoutSummary.tsx` | Hiển thị `order.order_code` thay vì `order.id.slice(0,8)` |
| `src/pages/BillingHistory.tsx` | Hiển thị `order_code` thay vì `id.slice(0,8)` |
| `src/components/OrderCountdown.tsx` | Nhận thêm prop `orderCode`, hiển thị thay `truncatedId` |

### Chi tiết kỹ thuật

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT;
  i INT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    result := 'ORD-' || to_char(NOW(), 'YYYYMM') || '-';
    FOR i IN 1..9 LOOP
      result := result || substr(chars, floor(random()*36)::int + 1, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_code = result) INTO exists_check;
    IF NOT exists_check THEN
      NEW.order_code := result;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Files

| File | Action |
|---|---|
| Migration SQL | Create — add `order_code` column + trigger |
| `supabase/functions/create-paypal-order/index.ts` | Edit — return `order_code` |
| `src/pages/CheckoutPayment.tsx` | Edit — display `order_code` |
| `src/pages/AddonCheckoutPayment.tsx` | Edit — display `order_code` |
| `src/pages/CheckoutSummary.tsx` | Edit — display `order_code` |
| `src/pages/BillingHistory.tsx` | Edit — display `order_code` |
| `src/components/OrderCountdown.tsx` | Edit — accept + display `orderCode` prop |

