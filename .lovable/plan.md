

## Fix tiếng Anh cho các trang sau đăng nhập

### Phân tích hiện trạng

**Đã hỗ trợ i18n (12 pages + 10 components):** Dashboard, Auth, Landing, Pricing, PricingDocs, Download, Terms, AccountSettings, WorkspaceMembers, Notifications, PersonalInfo, Upgrade + SidebarTreeNav, ReadOnlyBanner, MemberAuthForm, TopBar, DashboardLayout, etc.

**Chưa hỗ trợ — hardcoded tiếng Việt (20+ pages + 60+ components):**

| Nhóm | Trang / Component |
|------|-------------------|
| **Project** | `Groups.tsx`, `GroupDetail.tsx`, `TaskEditDialog`, `TaskNotes`, `TaskFilters`, `StageManagement`, `MemberManagementCard`, `GroupDashboard`, `ShareSettingsCard`, scores/* |
| **Calendar** | `Calendar.tsx`, `CalendarHeader`, `CreateEventDialog`, `CalendarDayDetail`, `CalendarMonthView`, `CalendarWeekView`, `CalendarDayView`, `EventDetailDialog` |
| **Communication** | `Communication.tsx`, chat components |
| **Service Plan** | `ServicePlan.tsx`, `AccountCleanupPanel` |
| **Workspace** | `WorkspaceSettings.tsx`, `CreateWorkspace.tsx` |
| **Admin** | `AdminSystem.tsx`, `AdminUsers.tsx`, `AdminActivity.tsx`, `AdminBackup.tsx` |
| **Misc** | `Feedback.tsx`, `Tips.tsx`, `Utilities.tsx`, `NotificationBell`, `PublicProfile`, `ResetPassword`, `ViewPasswordDialog`, `FilePreview` |

Tổng cộng: **~1000+ chuỗi hardcoded tiếng Việt** cần chuyển sang i18n keys.

### Kế hoạch — Chia thành 5 đợt (batches)

Do khối lượng rất lớn, cần chia nhỏ để đảm bảo chất lượng:

#### Batch 1: Trang chính người dùng thường xuyên sử dụng
- `Groups.tsx` — "Dự án của tôi", "Quản lý các dự án", "Chưa có dự án nào", etc.
- `GroupDetail.tsx` — tabs, confirm dialogs, loading states
- `ServicePlan.tsx` — plan names, tab labels, usage descriptions
- `WorkspaceSettings.tsx` — form labels, danger zone
- `CreateWorkspace.tsx` — form labels

**i18n keys mới:** Thêm sections `app.groups`, `app.groupDetail`, `app.servicePlan`, `app.createWorkspace` vào `en.ts` + `vi.ts`

#### Batch 2: Task & Project detail components
- `TaskEditDialog`, `TaskNotes`, `TaskFilters`
- `StageManagement`, `MemberManagementCard`
- `GroupDashboard`, `ShareSettingsCard`
- scores/* components

**i18n keys mới:** `app.task`, `app.stage`, `app.scores`

#### Batch 3: Calendar + Communication
- `Calendar.tsx` + tất cả calendar sub-components (8 files)
- `Communication.tsx` + chat components

**i18n keys mới:** `app.calendar`, `app.communication`

#### Batch 4: Admin pages
- `AdminSystem`, `AdminUsers`, `AdminActivity`, `AdminBackup`

**i18n keys mới:** `app.admin`

#### Batch 5: Misc pages + components
- `Feedback`, `Tips`, `Utilities`, `NotificationBell`
- `PublicProfile`, `ResetPassword`, `ViewPasswordDialog`, `FilePreview`
- `AccountCleanupPanel`

**i18n keys mới:** `app.feedback`, `app.tips`, `app.utilities`, `app.cleanup`

### Cách triển khai mỗi batch

1. **Thêm keys** vào `src/lib/i18n/en.ts` (English) và `src/lib/i18n/vi.ts` (Vietnamese — giữ nguyên text hiện tại)
2. **Sửa component**: import `useLanguage`, thay hardcoded string → `t.keyName`
3. **Pattern mẫu:**
```typescript
// Trước
<h1>Dự án của tôi</h1>

// Sau
const { translations: { app: t } } = useLanguage();
<h1>{t.groups.title}</h1>
```

### Đề xuất triển khai

Do tổng khối lượng lớn (~80+ files, ~1000+ strings), đề xuất **bắt đầu Batch 1** trước (5 pages quan trọng nhất). Sau khi xong sẽ tiếp tục các batch tiếp theo.

### Files thay đổi (Batch 1)

| File | Hành động |
|------|-----------|
| `src/lib/i18n/en.ts` | Thêm sections: `app.groups`, `app.groupDetail`, `app.servicePlan`, `app.createWorkspace` |
| `src/lib/i18n/vi.ts` | Thêm sections tương ứng (giữ text tiếng Việt hiện tại) |
| `src/pages/Groups.tsx` | Import useLanguage, thay ~30 strings |
| `src/pages/GroupDetail.tsx` | Import useLanguage, thay ~40 strings |
| `src/pages/ServicePlan.tsx` | Import useLanguage, thay ~50 strings |
| `src/pages/WorkspaceSettings.tsx` | Đã có i18n keys `app.workspace` — chỉ check còn hardcoded không |
| `src/pages/CreateWorkspace.tsx` | Import useLanguage, thay ~15 strings |

