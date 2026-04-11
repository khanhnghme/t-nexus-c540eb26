

## Fix: Nút "Về Dashboard" → "Về Lịch sử thanh toán" khi mở từ billing history

### Phân tích

Trang `/checkout/summary/:orderCode` có nút "Go to Dashboard" luôn navigate về `/dashboard`. Khi người dùng mở trang này từ `/billing-history`, nút này nên quay về `/billing-history` thay vì dashboard.

### Thay đổi

**File: `src/pages/CheckoutSummary.tsx`**

1. Detect nguồn truy cập: kiểm tra `document.referrer` hoặc dùng `sessionStorage` flag. Cách đơn giản nhất: dùng `location.state` hoặc check nếu history trước đó là billing-history. Tuy nhiên cách đáng tin nhất là kiểm tra `sessionStorage.getItem('checkout_from')`:
   - Nếu `checkout_from === 'onboarding'` → đã có logic "Continue Setup"
   - Nếu `checkout_from === 'billing'` → quay về `/billing-history`
   - Mặc định → quay về `/dashboard`

2. Tại `BillingHistory.tsx`: khi click vào row để navigate sang summary, set `sessionStorage.setItem('checkout_from', 'billing')`.

3. Tại `CheckoutSummary.tsx` section actions (status completed):
   - Thêm case `checkout_from === 'billing'` → nút hiển thị "Lịch sử thanh toán" / "Billing History" với icon `Receipt`, navigate về `/billing-history`.

4. Clean up `sessionStorage` khi navigate.

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/pages/BillingHistory.tsx` | Set `sessionStorage('checkout_from', 'billing')` khi navigate sang summary |
| `src/pages/CheckoutSummary.tsx` | Thêm case billing → nút quay về `/billing-history` |

