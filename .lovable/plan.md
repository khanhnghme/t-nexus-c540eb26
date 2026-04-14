

## Plan: Thêm hạn mức AI vào tất cả UI hiển thị tính năng gói

### Vấn đề
Hạn mức AI (Free: 5, Plus: 20, Pro: 50, Business: 150, Enterprise: Unlimited) đã đúng ở trang Pricing (`quotas` + `planComparison`) nhưng **thiếu** ở 3 nơi trong i18n:

1. **`servicePlanFeatures`** — danh sách compact trên trang Thông tin cá nhân
2. **`servicePlanFullFeatures`** — danh sách chi tiết trên trang Gói dịch vụ
3. **`servicePlanFeatureGroups`** — bảng phân nhóm trên trang Gói dịch vụ (category "Tools & Features")

### Thay đổi (2 files)

**`src/lib/i18n/en.ts`**
- `servicePlanFeatures`: Thêm item AI vào mỗi gói (`'AI Assistant: 5/day'`, `'20/day'`, `'50/day'`, `'150/day'`, `'Unlimited'`)
- `servicePlanFullFeatures`: Thêm dòng AI tương ứng vào mỗi gói
- `servicePlanFeatureGroups`: Thêm `{ label: 'AI Assistant', value: '5/day' }` vào category "Tools & Features" cho mỗi gói

**`src/lib/i18n/vi.ts`**
- Tương tự với text tiếng Việt (`'Trợ lý AI: 5 lượt/ngày'`, v.v.)

### Tổng: 2 files sửa, chỉ i18n

