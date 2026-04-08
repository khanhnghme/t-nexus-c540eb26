

## Triển khai Enforcement + UI chính xác + Nâng cao (Giai đoạn 1-2-3, bỏ billing thật)

### Tổng quan
Triển khai 8 hạng mục thiếu sót so với tài liệu `/guide/pricing`, chia 3 giai đoạn.

---

### Giai đoạn 1: Enforcement (Ưu tiên cao)

#### 1.1 Enforce workspace limit khi tạo WS
**File:** `supabase/functions/workspace-management/index.ts` (dòng 77-103)

- Trước khi INSERT workspace mới, đếm số WS hiện tại của caller: `SELECT count(*) FROM workspaces WHERE owner_id = callerId`
- Lấy `max_workspaces` từ `plan_limits` theo plan của caller (query profiles → user_plan → plan_limits)
- Nếu `count >= max_workspaces` → trả lỗi "Bạn đã đạt giới hạn X workspace cho gói Y"
- **Đồng thời**: thay hard-code `max_projects: 2, max_members: 5, max_storage_mb: 250` bằng giá trị từ `plan_limits` (giống trigger `auto_create_workspace_for_user`)

#### 1.2 Enforce project limit khi tạo project
**File:** `src/pages/Groups.tsx` (dòng 270+)

- Trước khi `supabase.from('groups').insert(...)`, gọi kiểm tra account-wide:
  1. Lấy `owner_id` từ `activeWorkspace`
  2. Đếm tổng projects trên tất cả WS của owner
  3. Lấy `max_projects_per_workspace` từ `plan_limits`
  4. Nếu vượt → hiển thị toast lỗi + block insert
- Tạo hook helper `useAccountLimitsCheck()` để tái sử dụng

#### 1.3 Enforce member (unique seat) limit khi mời
**File:** `supabase/functions/workspace-management/index.ts` (action `invite_workspace_member` + `invite_project_guest`)

- Trước khi tạo invite, đếm unique seat count của owner:
  ```sql
  -- Đếm distinct user_id từ workspace_members + workspace owner cho tất cả WS của owner
  SELECT COUNT(DISTINCT user_id) FROM workspace_members WHERE workspace_id IN (owner's WS ids)
  ```
- So sánh với `max_members_per_workspace` từ `plan_limits`
- Nếu invitee đã là member (unique seat đã tính) → cho phép (không tốn thêm suất)
- Nếu invitee là người mới + đã hết suất → trả lỗi

---

### Giai đoạn 2: UI chính xác

#### 2.1 Thay storage mock bằng dữ liệu thật
**File:** `src/pages/ServicePlan.tsx` (dòng 185)

- Thay `Math.random()` bằng query thật: tính tổng `file_size` từ các bảng lưu file (`project_resources`, `task_submissions`, v.v.) theo workspace_id
- Hoặc tạo RPC function `get_workspace_storage_usage(_workspace_id)` để tính server-side
- Tạo migration cho RPC function này

#### 2.2 Sửa per-WS breakdown
**File:** `src/pages/ServicePlan.tsx` (dòng 460-536)

- Per-WS card hiển thị **số thực tế** (projects/members/storage) của WS đó
- Nhưng **KHÔNG hiển thị limit per-WS** (vì limit là account-wide)
- Thay vì `3 / 15`, hiển thị `3 dự án` (chỉ con số thực tế)
- Limit đã hiển thị đúng ở phần tổng hợp phía trên → không lặp lại gây hiểu lầm
- Progress bar per-WS → hiển thị tỷ lệ đóng góp vào tổng (ví dụ WS chiếm 3/15 = 20% tổng)

---

### Giai đoạn 3: Nâng cao (bỏ #9 billing thật)

#### 3.1 Enforce upload file size limit
**File:** Frontend upload components + có thể thêm check ở edge function `r2-storage`

- Kiểm tra plan của owner → xác định max file size (Free: 5MB, Plus: 100MB, Pro+: 5GB)
- Thêm cột `max_file_size_mb` vào bảng `plan_limits` (migration)
- Check phía client trước upload + check phía server trong edge function

#### 3.2 i18n cho ServicePlan
**File:** `src/pages/ServicePlan.tsx`, `src/lib/i18n/vi.ts`, `src/lib/i18n/en.ts`

- Thay toàn bộ text hard-code tiếng Việt bằng keys từ `useLanguage()`
- Thêm section `servicePlan` vào cả file vi.ts và en.ts

#### 3.3 Chính sách hết hạn (Read-only + Grace Period + Hard Delete)
- **Read-only enforcement**: Tạo hook `useAccountReadOnly()` kiểm tra nếu user đã downgrade về Free mà dữ liệu vượt hạn mức → block tất cả hành động tạo/sửa
- **UI Banner**: Hiển thị banner cảnh báo trên dashboard khi ở trạng thái read-only
- **Grace Period tracking**: Thêm cột `downgraded_at` vào profiles hoặc bảng riêng `account_grace_periods`
- **Hard Delete (cron)**: Tạo edge function scheduled chạy hàng ngày, quét accounts quá 30 ngày → xóa dữ liệu dư thừa theo nguyên tắc "giữ cũ nhất"
- **Lưu ý**: Đây là logic phức tạp, cần migration + edge function + cron job

---

### Files cần tạo/sửa

| File | Hành động |
|------|-----------|
| `supabase/functions/workspace-management/index.ts` | Enforce WS + member limits, fix hard-code |
| `src/pages/Groups.tsx` | Enforce project limit |
| `src/hooks/useAccountLimitsCheck.ts` | Tạo mới — helper kiểm tra limits |
| `src/pages/ServicePlan.tsx` | Fix storage mock, fix per-WS breakdown, i18n |
| `src/lib/i18n/vi.ts` | Thêm keys `servicePlan` |
| `src/lib/i18n/en.ts` | Thêm keys `servicePlan` |
| `supabase/migrations/` | RPC `get_workspace_storage_usage`, thêm `max_file_size_mb`, thêm `downgraded_at` |
| `src/hooks/useAccountReadOnly.ts` | Tạo mới — check read-only state |
| `src/components/ReadOnlyBanner.tsx` | Tạo mới — banner cảnh báo |
| Edge function upload (r2-storage) | Enforce file size limit |
| Edge function `check-grace-period` | Tạo mới — cron xóa dữ liệu hết hạn |

### Không thay đổi
- Nội dung trang PricingDocs, Pricing, Upgrade (đã đúng)
- Bảng `plan_limits` (DB đã sync đúng)
- Hook `usePlanLimits.ts`, `useWorkspaceBilling.ts` (đã sửa trước đó)
- Tích hợp billing thật (#9 — để sau)

