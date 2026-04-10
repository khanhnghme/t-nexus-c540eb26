

## Giai đoạn 3.5: Nâng cấp tab "Current Plan" trong ServicePlan — Chi tiết hóa tiện ích

### Vấn đề hiện tại
Tab "Current Plan" chỉ hiển thị danh sách features dạng flat list với checkmark, không phân loại, không có số liệu cụ thể — khó phân biệt giá trị giữa các tính năng.

### Giải pháp
Thay thế flat list bằng **grouped feature cards** — chia features thành các nhóm có icon + giới hạn cụ thể, tương tự bảng comparison ở trang Upgrade nhưng chỉ hiển thị cột của gói hiện tại.

### Thay đổi

**1. `src/lib/i18n/en.ts` + `vi.ts` — Thêm `servicePlanFeatureGroups`**

Thay thế `servicePlanFullFeatures` (flat list) bằng structured data theo nhóm:

```ts
servicePlanFeatureGroups: {
  plan_free: [
    {
      category: 'Account & Workspaces',
      icon: 'building',
      items: [
        { label: 'Workspaces', value: '1' },
        { label: 'Total storage', value: '500 MB' },
        { label: 'Max upload per file', value: '5 MB' },
      ]
    },
    {
      category: 'Projects & Members',
      icon: 'folder',
      items: [
        { label: 'Total projects', value: '5' },
        { label: 'Total unique seats', value: '5' },
      ]
    },
    {
      category: 'Meetings & Communication',
      icon: 'video',
      items: [
        { label: 'Meeting duration', value: '15 min' },
        { label: 'Activity logs', value: '—' },
      ]
    },
    {
      category: 'Tools & Features',
      icon: 'sparkles',
      items: [
        { label: 'Basic task management', value: '✓' },
        { label: 'Group chat', value: '✓' },
        { label: 'Full data export', value: '—' },
        { label: 'Add-ons', value: '—' },
      ]
    },
    {
      category: 'Support',
      icon: 'headset',
      items: [
        { label: 'Support level', value: 'Standard Email' },
      ]
    },
  ],
  // plan_plus, plan_pro, plan_business, plan_custom tương tự với giá trị đúng theo bảng comparison
}
```

Giữ lại `servicePlanFullFeatures` cũ để backward-compatible nhưng UI sẽ ưu tiên dùng `servicePlanFeatureGroups`.

**2. `src/pages/ServicePlan.tsx` — Redesign phần features trong tab "plan"**

Thay block hiện tại (lines 316-329) — flat grid checkmarks — bằng:

- **Grouped cards**: Mỗi nhóm là 1 mini-card với header (icon + category name) và danh sách items dạng label-value pairs
- Layout: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Mỗi item trong card: flex row với label bên trái, value bên phải (bold), dùng Separator giữa các items
- Icon mapping: `building` → `Building2`, `folder` → `FolderKanban`, `video` → `Video`, `sparkles` → `Sparkles`, `headset` → `Shield`
- Value `✓` render thành `Check` icon màu emerald, value `—` render thành text muted

**3. Tương thích tiếng Việt**

Thêm `servicePlanFeatureGroups` tương ứng trong `vi.ts` với labels và category names tiếng Việt.

---

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/lib/i18n/en.ts` | Thêm `servicePlanFeatureGroups` (structured data cho 5 plans) |
| `src/lib/i18n/vi.ts` | Thêm `servicePlanFeatureGroups` tiếng Việt |
| `src/pages/ServicePlan.tsx` | Redesign features section → grouped cards với label-value pairs |

### Không thay đổi
- Database, edge functions, các trang khác
- Tab Usage, Add-ons, Billing giữ nguyên
- `servicePlanFullFeatures` giữ lại (backward-compatible)

