

## Nâng cấp tab "Tổng quan" — Hiển thị chi tiết subscription

### Vấn đề
Tab "Current Plan" chỉ hiển thị tên gói + badge Active/Free + 3 con số (workspace/project/member) + feature groups. Thiếu hoàn toàn thông tin subscription: ngày hết hạn, chu kỳ thanh toán, auto-renew, ngày bắt đầu, và gói downgrade đã lên lịch.

### Giải pháp
Thêm **Subscription Details Card** ngay dưới card gói hiện tại (trước feature groups), hiển thị rõ ràng:

```text
┌─────────────────────────────────────────────────┐
│  📋 Subscription Details                        │
│                                                 │
│  Started        │  01/04/2026                   │
│  Expires        │  01/05/2026                   │
│  Billing Cycle  │  Monthly                      │
│  Auto Renew     │  ✓ Enabled / ✗ Disabled       │
│  Plan Source    │  PayPal / Admin / System       │
│                                                 │
│  ⚠️ Scheduled Downgrade                         │
│  → Plus from 01/05/2026                         │
└─────────────────────────────────────────────────┘
```

- Nếu `plan_free` → ẩn card này (không có subscription)
- Nếu `plan_expires_at` đã gần (< 7 ngày) → highlight ngày hết hạn bằng `text-orange-500`
- Nếu `next_plan` tồn tại → hiển thị dòng cảnh báo downgrade trong card (thay vì card riêng bên dưới)
- Nếu `auto_renew = false` → hiển thị warning nhỏ "Will not auto-renew"

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/lib/i18n/en.ts` | Thêm keys: `subscriptionDetails`, `startedAt`, `expiresAt`, `billingCycle`, `autoRenew`, `autoRenewEnabled`, `autoRenewDisabled`, `planSource`, `scheduledDowngrade`, `willNotRenew`, `monthly`, `yearly` |
| `src/lib/i18n/vi.ts` | Tương ứng tiếng Việt |
| `src/pages/ServicePlan.tsx` | Thêm Subscription Details Card giữa plan info card và feature groups. Tích hợp `next_plan` warning vào card này thay vì card riêng. Logic highlight ngày gần hết hạn. |

### Chi tiết kỹ thuật

**ServicePlan.tsx** — Thêm block mới sau line 314 (sau stats row, trước Separator + features):

- Render card chỉ khi `isPremium`
- Đọc từ `profile`: `plan_started_at`, `plan_expires_at`, `billing_cycle`, `auto_renew`, `plan_source`, `next_plan`
- Dùng `CalendarDays`, `RefreshCw`, `CreditCard` icons
- Layout: grid 2 cols với label-value pairs
- Tích hợp `next_plan` info trực tiếp vào card → loại bỏ hoặc giữ card riêng ở line 368-389 tùy context

