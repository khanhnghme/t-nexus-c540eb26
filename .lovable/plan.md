

## Cập nhật giới hạn Connected Tools theo gói + UI thông báo rõ ràng

### Vấn đề hiện tại

1. **Không có kiểm tra gói** — `ConnectedServicesCard` cho phép MỌI user kết nối dịch vụ, kể cả Free/Plus (không có quyền Connected Tools)
2. **UI không thông báo** — Không có thông báo trực quan nào cho user Free/Plus biết họ cần nâng cấp để dùng Connected Tools
3. **Pricing/Upgrade** — Hiện chỉ hiện boolean (✓/—) cho Connected Tools, chưa hiện "Unlimited" rõ ràng

### Thay đổi

**1. `ConnectedServicesCard.tsx` — Thêm kiểm tra gói + UI khóa**

- Import `useAuth` và `shouldShowIntegrations`
- Nếu user plan là Free/Plus: hiển thị danh sách 3 dịch vụ nhưng **disabled**, thay nút "Connect" bằng badge "Yêu cầu Pro+" và nút "Nâng cấp" → navigate `/upgrade`
- Nếu user plan >= Pro: giữ nguyên logic hiện tại (connect/disconnect bình thường)
- Thêm banner nhỏ phía trên danh sách cho Free/Plus: "Dịch vụ liên kết khả dụng từ gói Pro trở lên"

**2. `ConnectedToolsBadge.tsx` — Cập nhật `ConnectedToolsTailwind`**

- Khi plan không đủ (Free/Plus): hiện danh sách với icon khóa (Lock) thay vì Check, kèm text "Cần gói Pro+"
- Khi plan đủ: giữ nguyên

**3. `Pricing.tsx` + `Upgrade.tsx` — Comparison table**

- Thay giá trị boolean `true` trong `CONNECTED_TOOLS_CATEGORY` thành text `"Unlimited"` cho Pro/Business/Enterprise
- Free/Plus giữ `false` (hiện —)

**4. `ServicePlanSection.tsx` — Hiện trạng thái Connected Tools cho mọi gói**

- Nếu plan < Pro: hiện Connected Tools section với icon Lock + "Nâng cấp để mở khóa"
- Nếu plan >= Pro: giữ nguyên hiện tại

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/settings/ConnectedServicesCard.tsx` | Thêm plan check, UI khóa + nút nâng cấp |
| `src/components/ConnectedToolsBadge.tsx` | Thêm variant locked cho plan thấp |
| `src/pages/Pricing.tsx` | `CONNECTED_TOOLS_CATEGORY` dùng `"Unlimited"` thay `true` |
| `src/pages/Upgrade.tsx` | `CONNECTED_TOOLS_CATEGORY` dùng `"Unlimited"` thay `true` |
| `src/components/personal/ServicePlanSection.tsx` | Hiện Connected Tools cho mọi gói (locked/unlocked) |

