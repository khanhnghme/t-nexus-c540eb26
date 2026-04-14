

## Plan: Fix 4 vấn đề 🔴 HIGH — Tối ưu hiệu năng

### HIGH #1: Code Splitting toàn bộ pages trong App.tsx

**Vấn đề:** 50+ pages import trực tiếp → initial bundle rất lớn. Chỉ 4 page dùng `React.lazy`.

**Giải pháp:** Chuyển tất cả page imports (trừ Landing) sang `React.lazy()`. Giữ `Landing` static vì là trang đầu tiên user thấy.

- Auth pages (7): Login, Register, Auth, ForgotPassword, VerifyOtp, ResetPasswordNew, PasswordSuccess
- Protected pages (14): Dashboard, Groups, GroupDetail, Communication, Calendar, Feedback, PersonalInfo, AccountSettings, Notifications, Tips, Onboarding, SearchPage, ServicePlan, BillingHistory
- Admin pages (7): AdminActivity, AdminBackup, AdminSystem, AdminBilling, AdminUserBilling, MemberManagement, Utilities
- Checkout pages (6): Checkout, CheckoutPayment, AddonCheckout, AddonCheckoutPayment, PaymentResult, CheckoutSummary
- Public pages (5): PublicProjectView, PublicProfile, PublicTaskPreview, FilePreview, ResetPassword
- Workspace pages (4): WorkspaceSettings, WorkspaceMembers, CreateWorkspace, Upgrade
- Misc (5): Pricing, PricingDocs, Privacy, Terms, Guide, DownloadPage, NotFound

**File:** `src/App.tsx`
**Impact:** Bundle giảm ~60-70%

---

### HIGH #2: Song song hóa queries trong GroupDetail

**Vấn đề:** `fetchGroupData()` chạy tuần tự 7 queries nối tiếp nhau.

**Giải pháp:** Sau khi fetch group, chạy song song:

```text
Step 1: group (1 query)
Step 2: Promise.all([stages, members+profiles])
Step 3: Access check (cần members data)
Step 4: Promise.all([tasks+assignments+profiles, meetings])
```

**File:** `src/pages/GroupDetail.tsx` — refactor `fetchGroupData()` (lines 237-344)
**Impact:** Từ 7 queries tuần tự → 3 bước song song, giảm ~40% thời gian load

---

### HIGH #3: Gộp + tối ưu Dashboard queries

**Vấn đề:** Dashboard mount gọi 6 API functions riêng lẻ. `fetchProjectStats` query `groups` + `group_members` trùng với `fetchDashboardData`.

**Giải pháp:**
1. Xóa `fetchProjectStats`, tính `ownedProjectCount`/`joinedProjectCount` từ data đã có trong `fetchDashboardData`
2. Chạy song song 5 fetch functions còn lại bằng `Promise.all`

**File:** `src/pages/Dashboard.tsx`
**Impact:** Giảm 2 API calls trùng lặp + chạy song song

---

### HIGH #4: React.memo cho list item components

**Vấn đề:** 0 components dùng `React.memo`. Mỗi state change → re-render toàn bộ list.

**Giải pháp:** Wrap `React.memo` cho 5 components:

| Component | File |
|-----------|------|
| DashboardProjectCard | `src/components/dashboard/DashboardProjectCard.tsx` |
| TaskCard | `src/components/TaskCard.tsx` |
| TaskListView | `src/components/TaskListView.tsx` |
| MemberManagementCard | `src/components/MemberManagementCard.tsx` |
| MessageItem | `src/components/communication/MessageItem.tsx` |

**Impact:** Giảm ~70% re-render không cần thiết

---

### Tổng kết

| # | Task | Files | Impact |
|---|------|-------|--------|
| 1 | Code splitting toàn bộ pages | `App.tsx` | Bundle -60% |
| 2 | Song song hóa GroupDetail queries | `GroupDetail.tsx` | Load -40% |
| 3 | Gộp Dashboard queries | `Dashboard.tsx` | API calls -30% |
| 4 | React.memo list items | 5 component files | Re-render -70% |

**Tổng: ~7 files thay đổi. Không thêm dependencies. Backward compatible 100%.**

