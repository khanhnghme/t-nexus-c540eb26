

## Bước 15: Phân biệt Quota (Hạn mức) và Feature (Tính năng) trong UI

### Mục tiêu
Tách danh sách tính năng hiện tại (flat list) thành 2 nhóm rõ ràng trên các màn hình Pricing, Upgrade và Onboarding: **Quota** (giới hạn số lượng) và **Feature** (chức năng được mở khóa).

### Phân tích hiện trạng
- `pricing.plans.*.features` trong i18n (`en.ts`, `vi.ts`) là mảng string phẳng, trộn lẫn quota và feature
- `PlanColumn` component (dùng chung cho Pricing + Upgrade) render tất cả bằng `<Check>` icon như nhau
- Onboarding `getPlanFeatures()` cũng lấy từ cùng mảng phẳng
- Comparison table (`comparisonCategories`) đã có cấu trúc tốt hơn (chia category) nhưng chưa label rõ Quota vs Feature

### Phạm vi thay đổi — 5 files

#### 1. `src/lib/i18n/en.ts` — Tái cấu trúc dữ liệu plan

Thay `features: string[]` bằng cấu trúc mới cho mỗi plan:

```typescript
plans: {
  free: {
    name: 'Plan Free',
    description: '...',
    cta: 'Sign up',
    quotas: [
      '1 Workspace',
      '5 total projects',
      '5 unique seats',
      '500 MB storage',
      '5 MB max upload / file',
      'Meetings up to 15 min',
    ],
    features: [
      'Basic task management',
      'Group chat',
      'Standard Email Support',
    ],
  },
  // plus, pro, business, enterprise tương tự...
}
```

Giữ lại `features` cũ (rename thành `_legacyFeatures` hoặc xóa) để không ảnh hưởng `comparisonCategories`.

#### 2. `src/lib/i18n/vi.ts` — Tương tự en.ts cho tiếng Việt

Cùng cấu trúc `quotas` + `features` cho mỗi plan.

#### 3. `src/pages/Pricing.tsx` — Cập nhật `PlanColumn` component

Thay vì render `plan.features` flat, render 2 section:

```
📊 Hạn mức (Quotas)
  ✓ 1 Workspace
  ✓ 5 total projects
  ...

⚡ Tính năng (Features)  
  ✓ Basic task management
  ✓ Group chat
  ...
```

- Thêm section label với icon phân biệt (ví dụ: `BarChart3` cho Quota, `Sparkles` cho Feature)
- Quota items dùng `Check` icon màu blue, Feature items dùng `Check` icon màu emerald/green
- Cập nhật `Plan` type: `features: string[]` → `quotas: string[]; features: string[]`

#### 4. `src/pages/Upgrade.tsx` — Cập nhật `PlanColumn` component

Logic tương tự Pricing nhưng dùng Tailwind classes (dark mode compatible). Cập nhật `Plan` type và `PlanColumn` rendering.

#### 5. `src/components/FirstTimeOnboarding.tsx` — Cập nhật plan step

- Sửa `getPlanFeatures()` → trả về `{ quotas, features }` thay vì flat array
- Render 2 nhóm trong plan card:
  - Nhóm Quota: icon `BarChart3`, label "Limits" / "Hạn mức"
  - Nhóm Feature: icon `Sparkles`, label "Features" / "Tính năng"
- Giữ compact vì card nhỏ: chỉ dùng label + màu icon khác nhau

### Thiết kế UI

```text
┌─────────────────────────┐
│  Plan Pro       $12/mo  │
│  ─────────────────────  │
│                         │
│  📊 Quotas              │
│  ✓ 20 Workspaces        │
│  ✓ 50 total projects    │
│  ✓ 50 unique seats      │
│  ✓ 50 GB storage        │
│  ✓ 5 GB max upload      │
│  ✓ Unlimited meetings   │
│                         │
│  ⚡ Features             │
│  ✓ All Plus features    │
│  ✓ Stage management     │
│  ✓ Advanced scoring     │
│  ✓ Full data export     │
│  ✓ Priority Support     │
│  ✓ Add-ons, 10% off     │
│                         │
│  🔗 Connected Tools     │
│  ✓ Gmail · Drive · Cal  │
└─────────────────────────┘
```

- Quota section label: font-semibold, icon `BarChart3`, text `#37352f`
- Feature section label: font-semibold, icon `Sparkles`, text `#37352f`  
- Quota check icon: `text-blue-500`
- Feature check icon: `text-emerald-500`
- Section spacing: `mt-3` giữa 2 nhóm

### Không thay đổi
- Comparison table (`comparisonCategories`) — đã có cấu trúc category riêng, giữ nguyên
- `servicePlanFeatures`, `servicePlanFullFeatures`, `servicePlanFeatureGroups` — dùng ở ServicePlan page, giữ nguyên
- `ServicePlanSection.tsx` — dùng `servicePlanFeatures`, không ảnh hưởng
- Database, edge functions, hooks — không liên quan
- `workspaceQuota.ts`, `planConfig.ts` — không thay đổi

### Rủi ro
- i18n structure change: cần đảm bảo TypeScript types vẫn compile
- Pricing và Upgrade dùng PlanColumn riêng (không share component) nên phải sửa cả 2

