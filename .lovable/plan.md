

## Plan: Chuẩn hóa toàn bộ UI/UX hiển thị gói dịch vụ (Single Source of Truth từ Pricing)

### Vấn đề hiện tại
Thông tin gói dịch vụ bị phân tán và mâu thuẫn tại nhiều nơi:

1. **PLAN_LABELS / PLAN_META / PLAN_COLORS** được khai báo lặp lại ở **9+ files** với nội dung không nhất quán
2. **AdminPlansTab** hiển thị sai giá: `$4.99/mo` (Plus), `$9.99/mo` (Pro), `$19.99/mo` (Business) — Pricing page ghi `$4.8`, `$12`, `$24`
3. **Onboarding** hiển thị `planBusinessF1: 'Unlimited Workspaces & projects'` nhưng Pricing ghi `50 Workspaces, 500 projects`
4. **Onboarding** hiển thị `planBusinessF2: '200 seats, 50GB storage'` nhưng Pricing ghi `200 GB storage`
5. **servicePlanFeatures** (ServicePlanSection) dùng danh sách riêng, không đồng bộ Pricing
6. **formatPlanName()** chỉ capitalize đơn giản (`plan_pro` → `Pro`), không match tên gói trên Pricing (`Plan Pro`)
7. **Checkout/PaymentResult** thiếu `plan_free` và `plan_custom` trong PLAN_LABELS
8. Màu sắc gói không thống nhất: Pro dùng `violet` ở admin, `purple` ở onboarding
9. Pricing page gọi gói cuối là **Enterprise** nhưng DB dùng **plan_custom**

### Giải pháp: Tạo 1 file cấu hình trung tâm

#### 1. Tạo `src/lib/planConfig.ts` — Single Source of Truth

```typescript
export const PLAN_ORDER = ['plan_free', 'plan_plus', 'plan_pro', 'plan_business', 'plan_custom'] as const;
export type PlanKey = typeof PLAN_ORDER[number];

export const PLAN_CONFIG: Record<PlanKey, {
  label: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  addonDiscount: number;
  color: string;          // Tailwind text color
  bgClass: string;        // Badge background
  badgeClass: string;     // Full badge styling
  rank: number;
}> = {
  plan_free:     { label: 'Free',       monthlyPrice: 0,    yearlyPrice: 0,   addonDiscount: 0,    color: 'text-muted-foreground', bgClass: 'bg-muted', badgeClass: 'bg-muted text-muted-foreground', rank: 0 },
  plan_plus:     { label: 'Plus',       monthlyPrice: 4.8,  yearlyPrice: 48,  addonDiscount: 0.10, color: 'text-blue-500',         bgClass: 'bg-blue-500/10', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', rank: 1 },
  plan_pro:      { label: 'Pro',        monthlyPrice: 12,   yearlyPrice: 120, addonDiscount: 0.20, color: 'text-violet-500',       bgClass: 'bg-violet-500/10', badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', rank: 2 },
  plan_business: { label: 'Business',   monthlyPrice: 24,   yearlyPrice: 240, addonDiscount: 0.20, color: 'text-amber-500',        bgClass: 'bg-amber-500/10', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', rank: 3 },
  plan_custom:   { label: 'Enterprise', monthlyPrice: null,  yearlyPrice: null, addonDiscount: 0, color: 'text-emerald-500',      bgClass: 'bg-emerald-500/10', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', rank: 4 },
};

export const getPlanLabel = (plan: string | null): string => 
  PLAN_CONFIG[plan as PlanKey]?.label ?? 'Free';

export const getPlanBadgeClass = (plan: string | null): string =>
  PLAN_CONFIG[plan as PlanKey]?.badgeClass ?? PLAN_CONFIG.plan_free.badgeClass;

export const getPlanColor = (plan: string | null): string =>
  PLAN_CONFIG[plan as PlanKey]?.color ?? PLAN_CONFIG.plan_free.color;

export const getPlanRank = (plan: string | null): number =>
  PLAN_CONFIG[plan as PlanKey]?.rank ?? 0;

export const isPremiumPlan = (plan: string | null): boolean =>
  (PLAN_CONFIG[plan as PlanKey]?.rank ?? 0) > 0;
```

#### 2. Xoá tất cả khai báo trùng lặp và import từ `planConfig.ts`

| File | Xoá | Thay bằng |
|------|-----|-----------|
| `src/hooks/useWorkspaceBilling.ts` | `formatPlanName()` | Import `getPlanLabel` |
| `src/lib/roleLabels.ts` | `getUserPlanLabel()` | Import `getPlanLabel` |
| `src/pages/Checkout.tsx` | `PLANS`, `PLAN_LABELS` | Import từ `planConfig` |
| `src/pages/PaymentResult.tsx` | `PLAN_LABELS` | Import `getPlanLabel` |
| `src/components/admin/AdminPlansTab.tsx` | `PLAN_META` | Import từ `planConfig` |
| `src/components/admin/AdminBillingDashboard.tsx` | `PLAN_LABELS`, `PLAN_COLORS` | Import từ `planConfig` |
| `src/components/admin/AdminBillingUsersTab.tsx` | `PLAN_LABELS`, `PLAN_COLORS` | Import từ `planConfig` |
| `src/components/admin/AdminCouponsTab.tsx` | `PLAN_LABELS` | Import `getPlanLabel` |
| `src/components/admin/AdminTransactionsTab.tsx` | `PLAN_LABELS` | Import `getPlanLabel` |
| `src/components/admin/UserPaymentsTab.tsx` | `PLAN_LABELS` | Import `getPlanLabel` |
| `src/components/layout/DashboardLayout.tsx` | `formatPlanName` import | Import `getPlanLabel` |
| `src/components/dashboard/BillingWidget.tsx` | `formatPlanName` import | Import từ `planConfig` |
| `src/components/personal/ServicePlanSection.tsx` | `formatPlanName` import | Import từ `planConfig` |

#### 3. Sửa dữ liệu sai so với Pricing

**AdminPlansTab** — sửa giá hiển thị:
- Plus: `$4.99/mo` → `$4.80/mo`
- Pro: `$9.99/mo` → `$12/mo`  
- Business: `$19.99/mo` → `$24/mo`
- Lấy giá từ `PLAN_CONFIG` thay vì hardcode

**Onboarding translations (en.ts + vi.ts)**:
- `planBusinessF1`: `'Unlimited Workspaces & projects'` → `'50 Workspaces, 500 projects'`
- `planBusinessF2`: `'200 seats, 50GB storage'` → `'200 seats, 200GB storage'`

**Onboarding `getPlanColor()`** — đổi Pro từ `purple` sang `violet` cho đồng bộ

**servicePlanFeatures** (en.ts + vi.ts) — đối chiếu lại với Pricing features, sửa nếu sai

#### 4. Thống nhất màu sắc gói

| Gói | Màu chính |
|-----|-----------|
| Free | `muted-foreground` (xám) |
| Plus | `blue-500` |
| Pro | `violet-500` |
| Business | `amber-500` |
| Enterprise/Custom | `emerald-500` |

Sửa Onboarding Pro card: `purple-500` → `violet-500`

#### 5. Cập nhật `formatPlanName` deprecation

Giữ `formatPlanName` trong `useWorkspaceBilling.ts` nhưng chuyển nội dung thành wrapper gọi `getPlanLabel` để không break import cũ. Dần migrate sang `getPlanLabel` trực tiếp.

### Files cần sửa/tạo

- **Tạo mới**: `src/lib/planConfig.ts`
- **Sửa** (~13 files): Tất cả files liệt kê ở bảng trên + `src/lib/i18n/en.ts` + `src/lib/i18n/vi.ts`

### Kết quả
- 1 file duy nhất quản lý tên, giá, màu, thứ hạng của tất cả gói
- Mọi trang hiển thị đồng bộ 100% với Pricing page
- Sửa tất cả dữ liệu sai (giá, giới hạn, màu sắc)
- Dễ bảo trì: thay đổi 1 chỗ → tự động cập nhật toàn hệ thống

