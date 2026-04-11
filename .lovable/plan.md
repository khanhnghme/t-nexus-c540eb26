

## Nâng cấp Connected Tools — Điều hướng tập trung về Cài đặt

### Hiện trạng
- **Calendar page** (`CalendarHeader.tsx`): Có nút Google Calendar Connect trực tiếp (connect/disconnect/sync)
- **Account Settings** (`AccountSettings.tsx`): Đã có `ConnectedServicesCard` — nơi tập trung quản lý cả 3 dịch vụ (Calendar, Gmail, Drive)
- **Pricing/Upgrade**: Connected Tools hiện chỉ show ✓/— (boolean), không có giới hạn cụ thể

### Thay đổi

**1. Calendar Header — Thay nút Connect bằng nút điều hướng**

File: `src/components/calendar/CalendarHeader.tsx`
- Khi chưa kết nối Google Calendar: thay nút "Google Calendar" (connect trực tiếp) → nút "Kết nối Calendar" điều hướng đến `/account-settings` (scroll đến phần Connected Services)
- Khi đã kết nối: giữ nút Sync + trạng thái "Đã kết nối", nhưng nút "Ngắt kết nối" trong dropdown → điều hướng đến `/account-settings` thay vì disconnect trực tiếp

File: `src/components/calendar/GoogleCalendarConnect.tsx`
- Cập nhật: khi chưa kết nối → `navigate('/account-settings#integrations')` thay vì gọi `onConnect`
- Khi đã kết nối: giữ nguyên Sync + dropdown nhưng "Ngắt kết nối" → điều hướng settings

**2. Pricing & Upgrade — Thêm chi tiết Connected Tools**

File: `src/pages/Pricing.tsx` + `src/pages/Upgrade.tsx`
- Thay đổi bảng so sánh Connected Tools từ boolean (✓/—) sang text cụ thể:
  - Free: — (không có)
  - Plus: — (không có)
  - Pro: "Unlimited" (✓)
  - Business: "Unlimited" (✓)
  - Enterprise: "Unlimited" (✓)
- Giữ nguyên hiển thị hiện tại vì không có giới hạn số lượng

**3. ConnectedToolsBadge — Thêm click điều hướng**

File: `src/components/ConnectedToolsBadge.tsx`
- `ConnectedToolsTailwind` (dùng trong ServicePlanSection): khi click → navigate đến `/account-settings#integrations`
- `ConnectedToolsInline` (dùng trong Pricing): giữ nguyên (không cần click)

**4. Account Settings — Thêm anchor ID**

File: `src/pages/AccountSettings.tsx`
- Thêm `id="integrations"` vào section Connected Services để hỗ trợ scroll-to khi navigate từ trang khác

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/calendar/GoogleCalendarConnect.tsx` | Nút connect → navigate settings; disconnect trong dropdown → navigate settings |
| `src/components/calendar/CalendarHeader.tsx` | Cập nhật props nếu cần |
| `src/components/ConnectedToolsBadge.tsx` | Thêm onClick navigate cho Tailwind variant |
| `src/pages/AccountSettings.tsx` | Thêm `id="integrations"` + scroll-to logic |

