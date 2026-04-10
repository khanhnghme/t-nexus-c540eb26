

## Giai đoạn 3: Thiết kế lại UI + Fix giá ví dụ Chapter 3

### Tổng quan
Cập nhật UI các trang để hiển thị trạng thái `next_plan` (gói đã lên lịch chuyển) một cách trực quan, đồng thời fix giá sai trong ví dụ Chapter 3 tại `/guide/pricing`.

---

### A. Fix giá ví dụ Chapter 3 (PricingDocs)

Giá hiện tại trong ví dụ đang sai:
- Business: `$30` → sửa thành `$24`
- Pro: `$10` → sửa thành `$12`
- Tổng: `$30 + $10 + $30 = $70` → sửa thành `$24 + $12 + $24 = $60`

**Files sửa:**
- `src/lib/i18n/en.ts` — `ch3s3Examples` (3 mục: Day 1, Day 10, Day 15)
- `src/lib/i18n/vi.ts` — `ch3s3Examples` tương ứng

---

### B. Checkout.tsx — Banner cảnh báo Downgrade

Thêm logic detect upgrade vs downgrade bằng cách fetch profile hiện tại (`user_plan`) và so sánh rank với gói đang chọn.

- **Nếu Downgrade**: hiển thị banner vàng phía trên PayPal buttons: *"Bạn sẽ được thu tiền ngay nhưng gói mới chỉ áp dụng khi hết chu kỳ hiện tại. Không hoàn tiền."*
- **Nếu đã có `next_plan`**: hiển thị warning bổ sung: *"Bạn đã lên lịch chuyển sang [gói X]. Nếu tiếp tục, khoản thanh toán trước đó không được hoàn lại."*
- Import `getPlanRank`, `getPlanLabel` từ `planConfig`

**File sửa:** `src/pages/Checkout.tsx`

---

### C. Upgrade.tsx — Badge "Scheduled" trên gói đã lên lịch

- Fetch `next_plan` từ profile
- Nếu gói nào trùng với `next_plan` → hiển thị badge `🔄 Scheduled` trên card gói đó
- Nút gói đã lên lịch → text "Đã lên lịch" thay vì "Nâng cấp/Hạ cấp"

**File sửa:** `src/pages/Upgrade.tsx`

---

### D. ServicePlan.tsx — Card hiển thị gói tiếp theo

Trong tab "Current Plan", thêm card/banner bên dưới card gói hiện tại:
- Nếu profile có `next_plan`: hiển thị info card với icon `🔄`, tên gói tiếp theo, và ngày chuyển dự kiến (`plan_expires_at`)
- Text: *"Gói tiếp theo: Pro — có hiệu lực từ [ngày]"*
- Dùng border-style amber/blue tùy theo context

**File sửa:** `src/pages/ServicePlan.tsx`

---

### E. ServicePlanSection.tsx — Dòng nhỏ "next plan" bên dưới badge

- Nếu profile có `next_plan`: hiển thị 1 dòng text nhỏ (text-xs) bên dưới badge gói hiện tại: *"→ Pro from [date]"*

**File sửa:** `src/components/personal/ServicePlanSection.tsx`

---

### F. i18n keys mới (EN + VI)

Thêm keys cho các banner/label mới:
- `downgradeWarning`, `downgradeWarningDesc`
- `existingScheduleWarning`
- `scheduledBadge`, `scheduledPlanLabel`
- `nextPlanInfo`, `nextPlanEffectiveFrom`

**Files sửa:** `src/lib/i18n/en.ts`, `src/lib/i18n/vi.ts`

---

### Tóm tắt files

| File | Thay đổi |
|------|----------|
| `src/lib/i18n/en.ts` | Fix giá ví dụ Ch3 + thêm i18n keys mới cho UI |
| `src/lib/i18n/vi.ts` | Fix giá ví dụ Ch3 + thêm i18n keys mới cho UI |
| `src/pages/Checkout.tsx` | Banner downgrade warning + existing schedule warning |
| `src/pages/Upgrade.tsx` | Badge "Scheduled" trên gói đã lên lịch |
| `src/pages/ServicePlan.tsx` | Card thông tin gói tiếp theo |
| `src/components/personal/ServicePlanSection.tsx` | Dòng "next plan" dưới badge |

### Không thay đổi
- Database, edge functions (đã xong ở Giai đoạn 2)
- PricingDocs.tsx layout (chỉ fix data i18n)
- Admin pages

