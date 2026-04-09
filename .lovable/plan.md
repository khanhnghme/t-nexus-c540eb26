

## Plan: Fix logic giới hạn — chuyển từ "per workspace" sang "Total Account"

### Vấn đề
- `PlanImpactPreview.tsx`: label hiển thị "Projects/WS", "Members/WS" — sai ngữ nghĩa. Projects usage hardcoded = 0.
- `AdminUserBilling.tsx`: hiển thị limits đúng nhưng vẫn dùng field name `max_projects_per_workspace` / `max_members_per_workspace` — cần đảm bảo label UI rõ ràng là "Total Account".
- Lưu ý: tên cột DB (`max_projects_per_workspace`, `max_members_per_workspace`) giữ nguyên vì không thể đổi schema dễ dàng, nhưng **UI và logic đều phải hiểu đây là giới hạn account-wide**.

### Thay đổi

**1. `src/components/admin/PlanImpactPreview.tsx`**
- Đổi label: `Projects/WS` → `Projects (Total)`, `Members/WS` → `Members (Total)`
- Fetch tổng projects thực tế (query tất cả workspace của owner → đếm groups) thay vì hardcode `used: 0`

**2. `src/pages/AdminUserBilling.tsx`**
- Đảm bảo label hiển thị rõ ràng: "Projects (Total)", "Members (Unique)" thay vì chỉ "Projects", "Members"
- Giữ nguyên logic fetch đã đúng (đang dùng `get_account_unique_members` + đếm projects across all workspaces)

**3. `src/pages/ServicePlan.tsx`**
- Kiểm tra label hiển thị — đảm bảo không có chỗ nào ghi "per workspace"

### Files

| File | Thay đổi |
|------|----------|
| `src/components/admin/PlanImpactPreview.tsx` | Fix labels + fetch total projects usage |
| `src/pages/AdminUserBilling.tsx` | Cập nhật label rõ ràng hơn |

