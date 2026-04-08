

## Tách trang Gói dịch vụ thành nhiều trang con (Tabs/Routes)

### Ý tưởng
Thay vì 1 trang dài gộp 5 sections, tách thành **3 tab** sử dụng URL query param (`?tab=`) để điều hướng:

```text
Tab 1: Gói hiện tại (default)  → Section 1 (Plan info + features) + Section 5 (Upgrade CTA)
Tab 2: Mức sử dụng             → Section 2 (Usage Overview) + Section 3 (Per-Workspace)
Tab 3: Lịch sử thanh toán      → Section 4 (Billing History)
```

### Thay đổi

#### 1. `src/pages/ServicePlan.tsx`
- Thêm `useSearchParams` để đọc `?tab=plan|usage|billing`
- Render `<Tabs>` với 3 `<TabsTrigger>`: "Gói hiện tại", "Mức sử dụng", "Lịch sử thanh toán"
- Mỗi `<TabsContent>` chứa đúng sections tương ứng (cắt từ code hiện tại, không thay đổi nội dung)
- Khi đổi tab → update URL query param (không reload trang)

#### 2. Routing
- Không cần thêm route mới — vẫn dùng `/service-plan` với query params
- Sidebar link "Gói dịch vụ" giữ nguyên

### Không thay đổi
- Nội dung/logic/data fetching các section giữ nguyên 100%
- Layout, typography, styling không đổi
- Các file khác không bị ảnh hưởng

