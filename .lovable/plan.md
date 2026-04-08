## Đồng bộ hệ thống giới hạn gói với tài liệu hướng dẫn pricing

### Vấn đề hiện tại

**Database `plan_limits` sai hoàn toàn** so với tài liệu đã định nghĩa:

| Gói | DB hiện tại (projects/members/storage/ws) | Đúng theo docs |
|-----|------------------------------------------|----------------|
| Free | 2 / 5 / 250MB / 1 | **5** / 5 / **500MB** / 1 |
| Plus | 5 / 15 / 1GB / 3 | **15** / 15 / **10GB** / **5** |
| Pro | 20 / 50 / 5GB / 10 | **50** / 50 / **50GB** / **20** |
| Business | 100 / 200 / 25GB / 50 | **500** / 200 / **200GB** / 50 |

**Logic hiển thị sai**: ServicePlan.tsx nhân `max_projects_per_workspace × số WS` — nhưng theo mô hình Global Pool, đây là tổng cộng toàn tài khoản, không nhân.

**Column naming mismatch**: Tên cột là `max_projects_per_workspace` và `max_members_per_workspace` nhưng ý nghĩa thực tế là **tổng toàn tài khoản** (account-wide).

### Các bước thực hiện

#### 1. Migration: Cập nhật giá trị trong bảng `plan_limits`
Rename columns không khả thi (ảnh hưởng types.ts auto-gen), nên chỉ **cập nhật giá trị** cho đúng:

```sql
UPDATE plan_limits SET max_projects_per_workspace = 5, max_storage_mb = 500, max_workspaces = 1 WHERE plan = 'plan_free';
UPDATE plan_limits SET max_projects_per_workspace = 15, max_storage_mb = 10000, max_workspaces = 5 WHERE plan = 'plan_plus';
UPDATE plan_limits SET max_projects_per_workspace = 50, max_storage_mb = 50000, max_workspaces = 20 WHERE plan = 'plan_pro';
UPDATE plan_limits SET max_projects_per_workspace = 500, max_storage_mb = 200000, max_workspaces = 50 WHERE plan = 'plan_business';
```

#### 2. Sửa `ServicePlan.tsx` — Bỏ phép nhân sai
- Line 393-394: Hiển thị `totalProjects / max_projects_per_workspace` (không nhân với số WS)
- Line 399-400: Progress bar tương tự
- Đây là giới hạn tổng toàn tài khoản, không cần nhân

#### 3. Sửa `usePlanLimits.ts` — Comment/rename interface cho rõ
- Rename interface fields: `maxProjectsPerWorkspace` → `maxTotalProjects`, `maxMembersPerWorkspace` → `maxTotalMembers` (chỉ ở phía client, vẫn map từ cùng column DB)
- Cập nhật tất cả nơi sử dụng hook này

#### 4. Sửa `useWorkspaceBilling.ts` — Dùng đúng field
- `maxProjects` giờ là tổng toàn tài khoản, không phải per-workspace
- `projectCount` nên đếm tổng projects trên tất cả WS của owner (thay vì chỉ WS hiện tại)

#### 5. Sửa `BillingWidget.tsx` — Hiển thị tổng projects toàn tài khoản
- Thay vì chỉ đếm projects trong WS hiện tại, đếm tổng trên tất cả WS của owner

#### 6. Sửa trigger `auto_create_workspace_for_user` (nếu cần)
- Hiện tại hard-code `max_projects: 2, max_members: 5, max_storage_mb: 250` — cần xác nhận các cột `max_projects`, `max_members`, `max_storage_mb` trên bảng `workspaces` có đang được dùng cho enforcement hay không. Nếu có, cần cập nhật trigger hoặc bỏ qua (vì enforcement nên dựa vào `plan_limits`).

### Files cần sửa

| File | Hành động |
|------|-----------|
| DB migration | UPDATE plan_limits values |
| `src/pages/ServicePlan.tsx` | Bỏ phép nhân projects × WS count |
| `src/hooks/usePlanLimits.ts` | Rename interface fields cho rõ ý nghĩa |
| `src/hooks/useWorkspaceBilling.ts` | Đếm tổng projects toàn account |
| `src/components/dashboard/BillingWidget.tsx` | Hiển thị tổng account-wide |

### Không thay đổi
- Nội dung i18n (đã đúng)
- Nội dung trang PricingDocs (đã đúng)
- Nội dung trang Pricing (đã đúng)
- Nội dung ServicePlanSection (đã đúng)
