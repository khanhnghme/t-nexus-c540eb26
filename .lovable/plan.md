

## Tạo trang tài liệu hướng dẫn giá `/docs/pricing` + CTA liên kết từ Pricing & Upgrade

### Tổng quan

Tạo một trang public mới tại `/docs/pricing` (và `/vi/docs/pricing`) chứa nội dung giải thích chi tiết mô hình tính giá. Đồng thời thêm một CTA dạng "Bạn có thắc mắc về bảng giá?" trên trang Pricing và Upgrade, dẫn đến trang này.

### Các bước thực hiện

#### 1. Tạo trang `src/pages/PricingDocs.tsx`
Trang public (ForceLightMode), thiết kế clean theo style hiện tại của Pricing page. Nội dung chia thành các section:

**Header:** "Hướng dẫn chi tiết về Bảng giá T-Nexus"

**Section 1 — Mô hình Chủ sở hữu trả tiền (Owner-based Billing)**
- Chỉ Owner trả tiền, member dùng miễn phí
- Bảng minh họa: Owner mua gói → tạo Workspace → mời thành viên → thành viên hưởng tính năng 0đ

**Section 2 — Suất thành viên duy nhất (Unique Seat Pool)**
- 1 Email = 1 Suất, dù tham gia bao nhiêu Workspace
- Ví dụ minh họa với icon/bảng

**Section 3 — Tổng kho tài nguyên (Global Resource Pool)**
- Giới hạn là con số tổng cộng, phân bổ linh hoạt
- Bảng so sánh giới hạn các gói (Free/Plus/Pro/Business)

**Section 4 — Add-ons**
- Giải thích add-on cộng vào tổng kho, áp dụng mọi Workspace

**Section 5 — Ví dụ thực tế**
- Kịch bản 1: Sinh viên dùng gói Free (1 WS, 5 người, 2 dự án)
- Kịch bản 2: Nhóm trưởng dùng gói Plus (3 WS, 15 người, phân bổ 30 dự án linh hoạt)

**Section 6 — FAQ nhanh**

#### 2. Thêm i18n translations
- Thêm key `pricingDocs` vào `vi.ts` và `en.ts` chứa toàn bộ nội dung trang (headings, paragraphs, bảng data, FAQ)

#### 3. Đăng ký route trong `App.tsx`
- Thêm route `/docs/pricing` và `/vi/docs/pricing` vào public routes (ForceLightMode)
- Cập nhật `PUBLIC_CANONICAL_PATHS` trong `LanguageContext.tsx`

#### 4. Thêm CTA link trên Pricing.tsx và Upgrade.tsx
- Thêm một banner/link nhỏ dạng:
  ```
  💡 Bạn có thắc mắc về cách tính giá? → Xem hướng dẫn chi tiết
  ```
- Đặt ngay trên hoặc dưới bảng FAQ hiện tại
- Link dẫn tới `/docs/pricing`

### Files cần tạo/sửa
| File | Hành động |
|------|-----------|
| `src/pages/PricingDocs.tsx` | Tạo mới |
| `src/App.tsx` | Thêm 2 routes |
| `src/contexts/LanguageContext.tsx` | Thêm path vào PUBLIC_CANONICAL_PATHS |
| `src/lib/i18n/vi.ts` | Thêm key `pricingDocs` |
| `src/lib/i18n/en.ts` | Thêm key `pricingDocs` |
| `src/pages/Pricing.tsx` | Thêm CTA link |
| `src/pages/Upgrade.tsx` | Thêm CTA link |

### Không thay đổi
- Logic thanh toán, plan limits, routing hiện tại
- Nội dung bảng giá trên Pricing/Upgrade (chỉ thêm link)

