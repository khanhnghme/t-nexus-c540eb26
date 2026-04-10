

## Giai đoạn 1: Thêm Chapter 3 — Upgrade & Downgrade Policy vào PricingDocs

### Tổng quan
Thêm chương mới vào `/guide/pricing` giải thích chi tiết chính sách nâng/hạ gói, theo đúng logic đã duyệt.

### Thay đổi

**1. `src/pages/PricingDocs.tsx`**
- Thêm 4 TOC entries mới vào `TOC_ENTRIES`:
  - `chapter-3` (level 1) — Chapter 3: Upgrade & Downgrade
  - `upgrade-policy` (level 2) — 3.1 Upgrade Policy
  - `downgrade-policy` (level 2) — 3.2 Downgrade Policy
  - `change-mind` (level 2) — 3.3 Change of Mind & Examples
- Thêm block render Chapter 3 sau Chapter 2 (trước CTA), gồm:
  - **3.1 Upgrade**: Icon `ArrowUpCircle`, mô tả 4 điểm (đổi plan ngay, reset chu kỳ, thu tiền gói mới, bỏ gói cũ) — dùng grid cards
  - **3.2 Downgrade**: Icon `ArrowDownCircle`, mô tả 3 điểm (thu tiền ngay, giữ gói cũ đến hết chu kỳ, tự động chuyển kỳ sau) — dùng grid cards + callout cảnh báo vàng
  - **3.3 Change of Mind**: Icon `RefreshCw`, giải thích chính sách "no refund" + 3 ví dụ minh họa (Ngày 1/10/15) dùng timeline cards
- Import thêm `ArrowUpCircle, ArrowDownCircle, RefreshCw` từ lucide-react

**2. `src/lib/i18n/en.ts` — pricingDocs section**
- Thêm keys:
  - `ch3Label`: "Chapter 3: Upgrade & Downgrade Policy"
  - TOC items: `ch3s1`, `ch3s2`, `ch3s3`
  - Content: `ch3s1Title`, `ch3s1Desc`, `ch3s1Steps` (4 items), `ch3s1Callout`
  - `ch3s2Title`, `ch3s2Desc`, `ch3s2Steps` (3 items), `ch3s2Callout`
  - `ch3s3Title`, `ch3s3Desc`, `ch3s3Examples` (3 timeline items), `ch3s3Callout`
  - Callout chính: *"Downgrades are scheduled for the next billing cycle and charged immediately. No refunds."*

**3. `src/lib/i18n/vi.ts` — pricingDocs section**
- Thêm keys tương ứng bản tiếng Việt:
  - `ch3Label`: "Chương 3: Chính sách Nâng/Hạ gói"
  - Nội dung đầy đủ tiếng Việt cho cả 3 section + ví dụ minh họa

### Không thay đổi
- Không sửa database, edge functions, hay UI pages khác
- Chapter 1 và 2 giữ nguyên hoàn toàn

