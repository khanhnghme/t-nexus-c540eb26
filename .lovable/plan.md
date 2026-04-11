

## Hiển thị đúng trạng thái "Tự động gia hạn" trong MyPlan

### Vấn đề

Component `ServicePlanSection` (card MyPlan ở trang Personal) không hiển thị trạng thái tự động gia hạn. Giá trị `profile?.auto_renew` có sẵn nhưng chưa được sử dụng.

### Thay đổi

**File: `src/components/personal/ServicePlanSection.tsx`**

Thêm một dòng hiển thị trạng thái auto-renew cho user premium, nằm dưới phần `nextPlan` info, trong khối header:

- Import thêm icon `RefreshCw` và `Minus`
- Nếu `isPremium`: hiển thị dòng "Tự động gia hạn: Bật/Tắt" với màu emerald (bật) hoặc orange (tắt)
- Dùng translations `t.autoRenewLabel`, `t.autoRenewOn`, `t.autoRenewOff`

**File: `src/lib/i18n/vi.ts` + `src/lib/i18n/en.ts`**

Thêm translations vào `servicePlanSection`:
- `autoRenewLabel`: "Tự động gia hạn" / "Auto Renew"
- `autoRenewOn`: "Bật" / "On"
- `autoRenewOff`: "Tắt" / "Off"

### Kết quả

Card MyPlan sẽ hiển thị chính xác trạng thái auto-renew từ database (`profile.auto_renew`) cho user có gói premium.

