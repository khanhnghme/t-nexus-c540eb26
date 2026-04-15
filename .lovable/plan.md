

# Hiển thị model AI cụ thể cho từng gói dịch vụ

## Tổng quan
Cập nhật tất cả nơi hiển thị thông tin "AI Assistant / Trợ lý AI" để thêm tên model cụ thể mà mỗi gói sử dụng:
- **Free & Plus** → Gemini Flash
- **Pro & Business** → DeepSeek V3.2
- **Enterprise** → DeepSeek V3.2

## Các file cần sửa

### 1. `src/lib/i18n/en.ts` — Cập nhật tất cả chuỗi AI Assistant
Thay đổi format từ `AI Assistant: X/month` thành `AI Assistant (Model): X/month`:

| Gói | Cũ | Mới |
|---|---|---|
| Free | `AI Assistant: 20/month` | `AI Assistant (Gemini Flash): 20/month` |
| Plus | `AI Assistant: 60/month` | `AI Assistant (Gemini Flash): 60/month` |
| Pro | `AI Assistant: 150/month` | `AI Assistant (DeepSeek V3.2): 150/month` |
| Business | `AI Assistant: 300/month` | `AI Assistant (DeepSeek V3.2): 300/month` |
| Enterprise | `AI Assistant: Unlimited` | `AI Assistant (DeepSeek V3.2): Unlimited` |

Áp dụng cho tất cả các vị trí:
- `pricing.plans.{plan}.quotas[]`
- `pricing.comparisonCategories` (bảng so sánh)
- `servicePlanFeatures.{plan}[]`
- `upgrade.plans.{plan}.quotas[]` / feature items
- `onboarding` plan comparison items

### 2. `src/lib/i18n/vi.ts` — Tương tự cho tiếng Việt
Thay đổi tương ứng:

| Gói | Cũ | Mới |
|---|---|---|
| Free | `Trợ lý AI: 20 lượt/tháng` | `Trợ lý AI (Gemini Flash): 20 lượt/tháng` |
| Plus | `Trợ lý AI: 60 lượt/tháng` | `Trợ lý AI (Gemini Flash): 60 lượt/tháng` |
| Pro | `Trợ lý AI: 150 lượt/tháng` | `Trợ lý AI (DeepSeek V3.2): 150 lượt/tháng` |
| Business | `Trợ lý AI: 300 lượt/tháng` | `Trợ lý AI (DeepSeek V3.2): 300 lượt/tháng` |
| Enterprise | `Trợ lý AI: Không giới hạn` | `Trợ lý AI (DeepSeek V3.2): Không giới hạn` |

### 3. Bảng so sánh chi tiết (comparison table)
Cập nhật row "AI Assistant" trong `comparisonCategories`:
- `free`: `20/month (Gemini Flash)`
- `plus`: `60/month (Gemini Flash)`
- `pro`: `150/month (DeepSeek V3.2)`
- `business`: `300/month (DeepSeek V3.2)`
- `enterprise`: `Unlimited (DeepSeek V3.2)`

### 4. Cập nhật memory
Update `mem://architecture/ai-model-tier-routing` ghi nhận model labels hiển thị trên UI.

## Không thay đổi
- Logic phân tầng model trong Edge Function — giữ nguyên.
- Component code (Pricing.tsx, Upgrade.tsx, FirstTimeOnboarding.tsx) — không cần sửa vì chúng đọc từ i18n.
- Trang AIAssistant.tsx — đã có badge model rồi.

