

## Đồng bộ toàn bộ hệ thống gói với tài liệu pricing

### Vấn đề phát hiện

**1. Database `plan_limits` sai hoàn toàn:**

| Gói | DB hiện tại (ws/projects/members/storage) | Đúng theo docs |
|-----|------------------------------------------|----------------|
| Free | 1 / 2 / 5 / 250MB | 1 / **5** / 5 / **500MB** |
| Plus | 3 / 5 / 15 / 1GB | **5** / **15** / 15 / **10GB** |
| Pro | 10 / 20 / 50 / 5GB | **20** / **50** / 50 / **50GB** |
| Business | 50 / 100 / 200 / 25GB | 50 / **500** / 200 / **200GB** |

**2. Logic hiển thị sai trong ServicePlan.tsx:**
- Dòng 393-394: Nhân `max_projects_per_workspace × số WS` — SAI vì đây là tổng cộng toàn tài khoản (Global Pool), không phải per-workspace.

**3. Hook naming gây hiểu lầm:**
- `maxProjectsPerWorkspace`, `maxMembersPerWorkspace` — tên gợi ý per-workspace nhưng thực tế là account-wide totals.

### Các bước thực hiện

#### Bước 1: Tạo edge function tạm để cập nhật plan_limits (rồi xóa sau)
Cần edge function dùng service role key để UPDATE bảng `plan_limits` (RLS chỉ cho SELECT).

```
supabase/functions/update-plan-limits/index.ts
```

Sau khi chạy thành công → xóa edge function.

#### Bước 2: Sửa `src/hooks/usePlanLimits.ts`
- Rename interface fields cho rõ ý nghĩa:
  - `maxProjectsPerWorkspace` → `maxTotalProjects`
  - `maxMembersPerWorkspace` → `maxTotalMembers`
- Vẫn map từ cùng DB column (`max_projects_per_workspace`)

#### Bước 3: Sửa `src/hooks/useWorkspaceBilling.ts`
- `projectCount` đếm tổng projects trên **tất cả WS của owner** (không chỉ WS hiện tại)
- `maxProjects` là tổng account-wide

#### Bước 4: Sửa `src/pages/ServicePlan.tsx`
- **Bỏ phép nhân sai** (dòng 393-394): Hiển thị `totalProjects / max_projects_per_workspace` trực tiếp
- Progress bar tương tự (dòng 399-400)
- Cập nhật interface `PlanLimitsData` field names

#### Bước 5: Sửa `src/components/dashboard/BillingWidget.tsx`
- Cập nhật field names theo hook mới

### Files cần sửa

| File | Hành động |
|------|-----------|
| `supabase/functions/update-plan-limits/` | Tạo tạm → chạy → xóa |
| `src/hooks/usePlanLimits.ts` | Rename fields |
| `src/hooks/useWorkspaceBilling.ts` | Đếm tổng account-wide |
| `src/pages/ServicePlan.tsx` | Bỏ nhân sai, rename fields |
| `src/components/dashboard/BillingWidget.tsx` | Sync field names |

### Không thay đổi
- Nội dung i18n (đã đúng hoàn toàn)
- Trang PricingDocs, Pricing, Upgrade (đã đúng)
- ServicePlanSection (đã đúng)

