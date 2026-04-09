

## Plan: Đợt 3 — Module 4 (Admin Actions) + Module 6 (Ghi chú nội bộ)

### Scope
Triển khai ManagePlanDialog với đầy đủ actions (upgrade/downgrade/extend/suspend/restore), Preview Impact, và tab Internal Notes. Thay thế tất cả quick action placeholders.

### 1. Component `ManagePlanDialog.tsx`
Dialog modal mở từ quick action buttons, gồm:
- **Select action**: Upgrade / Downgrade / Extend / Suspend / Restore / Grant Trial
- **Form động theo action**:
  - Upgrade/Downgrade: chọn plan mới, effective mode (immediate/next_cycle)
  - Extend: chọn số ngày (+7/+30/+90/custom)
  - Suspend: chọn mức khóa (toàn bộ premium)
  - Restore: khôi phục plan trước đó, option bù thời gian
- **Reason** (bắt buộc — disable nút Confirm nếu trống)
- **Internal note** (tùy chọn)
- **Checkbox**: Notify user, Apply immediately
- **Nút "Preview Impact"** → mở panel so sánh
- **Xác nhận 2 bước** cho thao tác nguy hiểm (downgrade→Free, suspend): nhập "CONFIRM" để kích hoạt nút

### 2. Component `PlanImpactPreview.tsx`
Hiển thị khi bấm Preview Impact:
- So sánh limits cũ vs mới (workspaces, projects, members, storage)
- Hiển thị usage hiện tại vs limit mới
- Đánh dấu đỏ các mục vượt limit
- Đề xuất xử lý: soft-lock, read-only

### 3. Hook `useAdminPlanActions.ts`
- Hàm `executePlanAction(action, params)`:
  - Update profiles: user_plan, plan_status, plan_expires_at, plan_source, billing_cycle
  - Insert plan_change_logs với đầy đủ thông tin
  - Invalidate queries
- Logic cho từng action type
- Validation: reason required, 2-step cho dangerous actions

### 4. Component `UserNotesTab.tsx`
Tab Internal Notes đầy đủ:
- Danh sách notes từ `admin_notes` WHERE user_id = userId
- Mỗi note: content, note_type badge (general/warning/vip/abuse/support/partner), created_by name, created_at
- Form thêm note mới: chọn type + nhập content
- Badge màu theo type: warning=amber, abuse=red, vip=emerald, partner=blue, support=violet, general=muted

### 5. Cập nhật `AdminUserBilling.tsx`
- Import ManagePlanDialog + UserNotesTab
- Quick action buttons mở ManagePlanDialog với action tương ứng
- Tab notes → `<UserNotesTab userId={userId} />`
- Refetch profile sau khi action thành công

### 6. i18n — thêm chuỗi
- Block `adminBilling.managePlan`: action labels, form labels, reason placeholder, confirm dialog, preview impact labels, dangerous action warning
- Block `adminBilling.notes`: note types, form labels, empty state

### Files

| File | Thay đổi |
|------|----------|
| `src/components/admin/ManagePlanDialog.tsx` | Component mới: dialog quản lý gói |
| `src/components/admin/PlanImpactPreview.tsx` | Component mới: preview ảnh hưởng |
| `src/hooks/useAdminPlanActions.ts` | Hook mới: logic thực thi actions |
| `src/components/admin/UserNotesTab.tsx` | Component mới: tab ghi chú nội bộ |
| `src/pages/AdminUserBilling.tsx` | Kết nối dialog + notes tab |
| `src/lib/i18n/en.ts` | Thêm chuỗi managePlan + notes |
| `src/lib/i18n/vi.ts` | Thêm chuỗi managePlan + notes |

