

## Plan: Harden Payment System — Chính xác, không lỗi, không gian lận

### Phân tích hiện trạng

Hệ thống đã có nền tảng tốt: dual-path (capture endpoint + webhook), idempotent order check, server-side validation. Tuy nhiên có 6 lỗ hổng cần vá.

### Các thay đổi cần thực hiện

#### 1. Webhook Signature Verification (Chống giả mạo)
**File:** `supabase/functions/paypal-webhook/index.ts`
- Thêm xác thực chữ ký PayPal webhook bằng `PAYPAL_WEBHOOK_ID` (secret đã có)
- Gọi PayPal API `/v1/notifications/verify-webhook-signature` trước khi xử lý
- Reject mọi request không hợp lệ → chống giả mạo webhook

#### 2. Idempotent Addon & Coupon Updates (Chống cập nhật trùng)
**Files:** `capture-paypal-order/index.ts`, `paypal-webhook/index.ts`
- Thêm cột `addons_applied` (boolean, default false) và `coupon_applied` (boolean, default false) vào bảng `orders`
- Trước khi update addons: check `addons_applied = false`, sau đó set `true`
- Trước khi increment coupon `used_count`: check `coupon_applied = false`, sau đó set `true`
- Cả capture và webhook đều dùng cùng logic → không bao giờ double-apply

#### 3. Auto-Cancel Stale Pending Orders (Tự hủy đơn chưa thanh toán)
**File:** `supabase/functions/cleanup-pending-orders/index.ts` (NEW)
- Edge function chạy định kỳ (cron mỗi giờ)
- Cancel tất cả orders có `status = 'pending'` và `created_at < NOW() - 2 hours`
- Set `status = 'expired'`
- Đảm bảo coupon chưa được tính (coupon chỉ tính khi `completed`)

#### 4. Frontend Refresh Profile After Payment (Đồng bộ trạng thái)
**Files:** `src/pages/Checkout.tsx`, `src/pages/AddonCheckout.tsx`, `src/components/FirstTimeOnboarding.tsx`, `src/pages/PaymentResult.tsx`
- Sau khi capture thành công: gọi `refreshProfile()` từ AuthContext trước khi navigate
- Trong PaymentResult: gọi `refreshProfile()` khi mount (success case) để profile luôn fresh
- Mất mạng / reload → profile tự fetch lại từ DB (đã có sẵn trong AuthContext)

#### 5. Database Migration
**Thêm cột mới vào bảng `orders`:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS addons_applied boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_applied boolean DEFAULT false;
```

#### 6. Cron Job cho Cleanup
- Enable `pg_cron` + `pg_net` extensions
- Schedule cleanup-pending-orders chạy mỗi giờ

### Tóm tắt nguyên tắc đạt được

| Nguyên tắc | Giải pháp |
|---|---|
| Thanh toán → backend cập nhật ngay | ✅ Đã có (capture + webhook) |
| Backend là nguồn sự thật | ✅ Đã có + thêm refreshProfile frontend |
| Mất mạng/reload giữ đúng | ✅ refreshProfile + AuthContext auto-fetch |
| Trạng thái rõ ràng | ✅ pending → completed/failed/expired |
| Idempotent | 🔧 Thêm `addons_applied` + `coupon_applied` flags |
| Chưa trả → không tính coupon | ✅ Đã có + thêm auto-expire pending orders |
| Chống gian lận | 🔧 Thêm webhook signature verification |

### Files tạo/sửa

| File | Action |
|---|---|
| `supabase/functions/paypal-webhook/index.ts` | Edit — add signature verification + idempotent flags |
| `supabase/functions/capture-paypal-order/index.ts` | Edit — add idempotent flags |
| `supabase/functions/cleanup-pending-orders/index.ts` | Create — auto-expire stale orders |
| `src/pages/Checkout.tsx` | Edit — refreshProfile after success |
| `src/pages/AddonCheckout.tsx` | Edit — refreshProfile after success |
| `src/components/FirstTimeOnboarding.tsx` | Edit — refreshProfile after success |
| `src/pages/PaymentResult.tsx` | Edit — refreshProfile on mount |
| DB migration | Add `addons_applied`, `coupon_applied` columns + cron job |

