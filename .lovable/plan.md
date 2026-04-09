

## Plan: Cập nhật bước chọn Plan trong Onboarding khớp với trang Pricing

### Vấn đề hiện tại
Onboarding hiển thị sai giá và giới hạn so với trang Pricing/Upgrade:
- Free: ghi "2 projects, 5 members, 250MB" nhưng Pricing ghi "5 projects, 5 seats, 500MB"
- Plus: ghi "$4.8, 10 projects, 15 members, 2GB" nhưng cần "5 WS, 15 projects, 10GB"
- Pro: ghi "$12, unlimited projects, 50 members, 10GB" nhưng cần "20 WS, 50 projects, 50GB"
- Thiếu gói Business ($24/mo) và dòng liên hệ Enterprise

### Thay đổi

**1. `src/components/FirstTimeOnboarding.tsx`**
- Thêm card **Business** ($24/mo, màu amber) vào grid, đổi grid sang `md:grid-cols-4`
- Thêm dòng nhỏ dưới grid: "Need a custom plan? Contact support@t-nexus.app"
- Khi chọn gói trả phí và nhấn "Tiếp tục": hoàn tất onboarding với `plan_free` tạm, rồi redirect sang `/checkout?plan=plan_[plus/pro/business]`
- Khi chọn Free: giữ nguyên luồng hiện tại

**2. `src/lib/i18n/en.ts` & `src/lib/i18n/vi.ts`**
Cập nhật tất cả translation keys cho khớp với trang Pricing:

| Key | Cũ (sai) | Mới (đúng - theo Pricing) |
|-----|----------|--------------------------|
| planFreeF1 | 2 projects | 1 Workspace, 5 projects |
| planFreeF2 | 5 members/ws | 5 unique seats, 500MB storage |
| planFreeF3 | 250MB storage | Meetings 15 min |
| planPlusF1 | 10 projects | 5 Workspaces, 15 projects |
| planPlusF2 | 15 members/ws | 15 seats, 10GB storage |
| planPlusF3 | 2GB storage | Activity logs 30 days, Export |
| planProF1 | Unlimited projects | 20 Workspaces, 50 projects |
| planProF2 | 50 members/ws | 50 seats, 50GB storage |
| planProF3 | 10GB + export | Unlimited meetings & logs |

Thêm keys mới: `planBusinessF1`, `planBusinessF2`, `planBusinessF3`, `planContactEnterprise`

### Files cần sửa
- `src/components/FirstTimeOnboarding.tsx`
- `src/lib/i18n/en.ts`
- `src/lib/i18n/vi.ts`

