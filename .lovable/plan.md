

# Fix hiển thị sai AI credits trên nhiều trang

## Các lỗi phát hiện

### Lỗi 1: `servicePlanFeatureGroups` — AI credit values sai (nghiêm trọng)
Trong cả `en.ts` và `vi.ts`, phần `servicePlanFeatureGroups` (dùng ở trang Upgrade) hiển thị **giá trị message cũ** thay vì credit mới:

| Gói | Hiện tại (SAI) | Đúng |
|-----|---------------|------|
| Free | `20/month` | `Free (Gemini Flash)` |
| Plus | `60/month` | `Free (Gemini Flash)` |
| Pro | `150/month` | `1,000 credits/month` |
| Business | `300/month` | `2,500 credits/month` |

### Lỗi 2: `(DeepSeek V3.2)` dán nhầm vào các row không liên quan đến AI
Trong `servicePlanFeatureGroups` (Pro, Business, Enterprise) và `comparisonCategories` (Enterprise column):
- `Meeting duration: Unlimited (DeepSeek V3.2)` → nên là `Unlimited`
- `Activity logs: Unlimited (DeepSeek V3.2)` → nên là `Unlimited`
- `Workspaces: Unlimited (DeepSeek V3.2)` → nên là `Unlimited`
- `Total storage: Unlimited (DeepSeek V3.2)` → nên là `Unlimited`
- Chỉ row **AI Assistant** mới nên có `(DeepSeek V3.2)`

## Thay đổi

### File 1: `src/lib/i18n/en.ts`
- **comparisonCategories** (dòng 405-422): Xóa `(DeepSeek V3.2)` khỏi enterprise column của non-AI rows
- **servicePlanFeatureGroups** (dòng 3236-3343): Fix tất cả AI values + xóa `(DeepSeek V3.2)` khỏi Meeting/Logs rows

### File 2: `src/lib/i18n/vi.ts`  
- **comparisonCategories** (dòng 407-424): Tương tự en.ts
- **servicePlanFeatureGroups** (dòng 3209-3270): Tương tự en.ts

### Giá trị đúng cần áp dụng

**en.ts `servicePlanFeatureGroups`:**
- Free AI: `Free (Gemini Flash)`
- Plus AI: `Free (Gemini Flash)` 
- Pro AI: `1,000 credits/month (DeepSeek V3.2)`
- Business AI: `2,500 credits/month (DeepSeek V3.2)`
- Enterprise AI: `Unlimited (DeepSeek V3.2)`
- Meeting/Logs Pro+Business: `Unlimited` (no DeepSeek tag)

**vi.ts `servicePlanFeatureGroups`:**
- Free AI: `Miễn phí (Gemini Flash)`
- Plus AI: `Miễn phí (Gemini Flash)`
- Pro AI: `1.000 credit/tháng (DeepSeek V3.2)`
- Business AI: `2.500 credit/tháng (DeepSeek V3.2)`
- Enterprise AI: `Không giới hạn (DeepSeek V3.2)`
- Meeting/Logs Pro+Business: `Không giới hạn` (no DeepSeek tag)

**Enterprise comparison columns:** Remove `(DeepSeek V3.2)` from non-AI rows (Workspaces, Storage, Projects, Members, Meeting, Logs).

## Không thay đổi
- DB values (`plan_limits`) — đã đúng: Pro 1000, Business 2500
- `servicePlanFeatures` — đã đúng
- `servicePlanFullFeatures` — đã đúng  
- Pricing cards (`plans` array) — đã đúng
- AIAssistant.tsx, AIAssistantPanel.tsx — logic đã đúng
- Edge Function — đã đúng

