

# Thêm thanh Credit Usage vào trang AI Assistant

## Phân tích hiện trạng
- **i18n** (en.ts, vi.ts): Đã cập nhật đầy đủ credit/tháng cho tất cả gói tại Pricing, Upgrade, Onboarding, ServicePlanSection → **không cần sửa thêm**.
- **AIAssistant.tsx**: Đã có state `creditsUsed`, `maxCredits`, `usageLoading` nhưng **chưa hiển thị UI thanh credit**.

## Thay đổi duy nhất: `src/pages/AIAssistant.tsx`

Thêm **Credit Usage Bar** vào 2 vị trí:

### 1. Empty State (trang trống, chưa có tin nhắn)
Hiển thị dưới suggestions grid:
- **Free/Plus** (maxCredits === null): Badge nhỏ "✦ Miễn phí · Gemini Flash"
- **Pro/Business** (maxCredits !== null): Progress bar "Đã dùng X / Y credit" + phần trăm
- Khi còn < 15%: bar đổi màu amber/đỏ + text cảnh báo + nút "Nâng cấp"

### 2. Chat State (đang trò chuyện)
Hiển thị compact ở footer, bên cạnh input:
- **Free/Plus**: Ẩn (không chiếm chỗ)
- **Pro/Business**: Inline text nhỏ "X/Y credit" + mini progress bar

### UI chi tiết

```text
┌─────────────────────────────────────┐
│  Empty State                        │
│  [Logo + Greeting + Input + Grids]  │
│                                     │
│  ┌─ Credit Bar (Pro/Business) ────┐ │
│  │ 🔥 142 / 1,000 credit  ██░░░  │ │
│  │    14.2% đã sử dụng           │ │
│  └────────────────────────────────┘ │
│                                     │
│  ── hoặc (Free/Plus) ──            │
│  │ ✦ Miễn phí · Gemini Flash     │ │
└─────────────────────────────────────┘
```

### Thành phần sử dụng
- `Progress` component từ `@/components/ui/progress`
- Màu sắc: emerald (< 70%), amber (70-90%), destructive (> 90%)
- i18n: Thêm vài key nhỏ cho credit bar labels (dùng fallback inline)

## Không thay đổi
- Các trang Pricing, Upgrade, Onboarding, ServicePlan — đã đúng từ bước trước
- Edge Function, DB, workspaceQuota — giữ nguyên
- i18n en.ts / vi.ts — chỉ thêm 2-3 key nhỏ cho credit bar

