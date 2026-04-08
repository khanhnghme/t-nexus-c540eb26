

## Fix Read-only Banner + Redesign trang Tổng quan Workspace

### Vấn đề hiện tại

**1. ReadOnlyBanner trên trang chủ quá to:**
- Banner chiếm nhiều dòng, có tiêu đề + mô tả dài + 2 nút bấm
- Yêu cầu: chỉ hiển thị 1 dòng nhỏ gọn trên trang chủ (dashboard), các vị trí khác giữ nguyên

**2. WorkspaceSettings hiển thị sai/gây nhầm lẫn:**
- Stats cards đọc từ `activeWorkspace.max_members`, `activeWorkspace.max_projects`, `activeWorkspace.max_storage_mb` — đây là giá trị **per-workspace** cũ (legacy), không phải account-wide limits thật
- `storageUsed = 0` — hardcode placeholder, không query dữ liệu thật
- Plan tab hiển thị `activeWorkspace.plan` (plan từ bảng workspaces) thay vì owner's plan từ profiles
- BillingWidget hiển thị thông tin account-wide ngay trên workspace page → trùng lặp với Stats cards nhưng số liệu khác nhau → nhầm lẫn

---

### Kế hoạch

#### Bước 1: Compact ReadOnlyBanner cho Dashboard
**File:** `src/components/ReadOnlyBanner.tsx`

- Thêm prop `compact?: boolean`
- Khi `compact=true`: render 1 dòng duy nhất, inline, nhỏ gọn:
  - `⚠️ Tài khoản chỉ đọc — Nâng cấp | Dọn dẹp` (link inline, không nút)
  - Chiều cao ~32px, font-size text-xs
- Khi `compact=false` (mặc định): giữ nguyên banner đầy đủ hiện tại

**File:** `src/components/layout/DashboardLayout.tsx`
- Truyền `<ReadOnlyBanner compact />` ở vị trí hiện tại

#### Bước 2: Redesign WorkspaceSettings — hiển thị đúng mô hình Global Pool
**File:** `src/pages/WorkspaceSettings.tsx`

Thay đổi chính:

**Stats Cards (4 thẻ):**
- **Thành viên**: hiển thị `memberCount` thực tế của WS này (không kèm limit — vì limit là account-wide)
- **Dự án**: hiển thị `projectCount` thực tế của WS này
- **Dung lượng**: query `get_workspace_storage_usage` RPC để lấy storage thật, thay `storageUsed = 0`
- **Gói dịch vụ**: lấy owner's plan từ `useWorkspaceBilling()` thay vì `activeWorkspace.plan`

Subtitle của mỗi stat card → hiển thị "đóng góp vào tổng" thay vì "Tối đa {n}" sai:
- VD: "3 / 15 tổng tài khoản" thay vì "Tối đa 5"

**Plan Tab:**
- Hiển thị owner's plan (từ `useWorkspaceBilling`) thay vì `activeWorkspace.plan`
- Plan details sử dụng account-wide limits từ `plan_limits` (thông qua `useWorkspaceBilling` hoặc fetch trực tiếp)

**Bỏ BillingWidget** khỏi trang này — thông tin đã được tích hợp vào Stats cards và Plan tab, tránh trùng lặp gây nhầm lẫn.

#### Bước 3: Cập nhật i18n
**Files:** `src/lib/i18n/vi.ts`, `src/lib/i18n/en.ts`

- Thêm keys mới cho workspace stats: `ofAccountTotal`, `wsContribution`
- Sửa `maxMembers`, `maxProjects` subtitle thành "of {total} account-wide"

---

### Files cần sửa

| File | Hành động |
|------|-----------|
| `src/components/ReadOnlyBanner.tsx` | Thêm mode compact |
| `src/components/layout/DashboardLayout.tsx` | Truyền `compact` prop |
| `src/pages/WorkspaceSettings.tsx` | Redesign stats, plan tab, bỏ BillingWidget, dùng dữ liệu thật |
| `src/lib/i18n/vi.ts` | Cập nhật keys workspace |
| `src/lib/i18n/en.ts` | Cập nhật keys workspace |

### Không thay đổi
- `useAccountReadOnly`, `useAccountLimitsCheck`, `useWorkspaceBilling` — logic đã đúng
- ReadOnlyBanner ở các vị trí khác (nếu mở rộng sau) — giữ nguyên dạng đầy đủ
- Enforcement guards — đã hoàn thiện

