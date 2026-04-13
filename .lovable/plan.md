

## Bước 14: Tạo Workspace Quota & Feature Engine — `src/lib/workspaceQuota.ts`

### Mục tiêu
Tạo file engine trung tâm định nghĩa tất cả **Quota keys** (`resource:limit`) và **Feature keys** (`resource:feature`) theo format mới, đồng thời tạo hook `useWorkspaceQuota()` hợp nhất logic kiểm tra hạn mức/tính năng từ gói cước của Owner.

### Bối cảnh hiện tại
- `usePlanLimits` — truy vấn giới hạn theo workspace's owner plan (7 consumers)
- `useAccountLimitsCheck` — truy vấn giới hạn account-wide cho owner (6 consumers)
- `useWorkspaceBilling` — truy vấn owner plan + project count (ít consumer)
- Feature check: chỉ có `canExportData` (ad-hoc, nằm trong `usePlanLimits`)
- **Vấn đề**: Không có kiến trúc thống nhất, feature flags nằm rải rác, không follow naming convention `resource:*`

### Phạm vi thay đổi — 2 files (tạo mới + refactor)

#### 1. TẠO MỚI: `src/lib/workspaceQuota.ts`

Định nghĩa bộ khung trung tâm:

```typescript
// ─── Quota Keys (resource:limit) ───────────────────────
export type QuotaKey =
  | 'workspace:limit_count'        // max workspaces
  | 'workspace:limit_projects'     // max projects (total)
  | 'workspace:limit_members'      // max unique members
  | 'workspace:limit_storage_mb'   // max storage
  | 'workspace:limit_file_size_mb' // max file size
  | 'workspace:limit_meeting_min'  // max meeting duration
  | 'workspace:limit_log_days';    // max activity log days

// ─── Feature Keys (resource:feature) ───────────────────
export type FeatureKey =
  | 'workspace:feature_export'     // can export data
  | 'workspace:feature_ai';       // AI assistant (future)

// ─── Mapping: plan_limits columns → keys ────────────────
const QUOTA_COLUMN_MAP: Record<QuotaKey, string> = {
  'workspace:limit_count': 'max_workspaces',
  'workspace:limit_projects': 'max_projects_per_workspace',
  'workspace:limit_members': 'max_members_per_workspace',
  'workspace:limit_storage_mb': 'max_storage_mb',
  'workspace:limit_file_size_mb': 'max_file_size_mb',
  'workspace:limit_meeting_min': 'max_meeting_duration_minutes',
  'workspace:limit_log_days': 'max_activity_log_days',
};

const FEATURE_COLUMN_MAP: Record<FeatureKey, string> = {
  'workspace:feature_export': 'can_export_data',
  'workspace:feature_ai': 'can_use_ai', // future column
};

// ─── Helper functions ───────────────────────────────────
export function getQuotaLimit(planData: any, key: QuotaKey): number | null;
export function hasFeature(planData: any, key: FeatureKey): boolean;
export function isQuotaExceeded(current: number, limit: number | null): boolean;
```

#### 2. REFACTOR: `src/hooks/usePlanLimits.ts`

- Import `QuotaKey`, `FeatureKey`, helpers từ `workspaceQuota.ts`
- Interface `PlanLimits` giữ nguyên fields (backward compatible) nhưng thêm:
  - `getQuota(key: QuotaKey): number | null`
  - `hasFeature(key: FeatureKey): boolean`
- Bên trong `fetchLimits`, dùng `getQuotaLimit()` và `hasFeature()` thay vì hardcode column names
- **KHÔNG đổi tên hook** — giữ `usePlanLimits()` để backward compatible
- Consumers hiện tại (`canExportData`, `maxMeetingDurationMinutes`, v.v.) vẫn hoạt động

### Không thay đổi
- `useAccountLimitsCheck` — giữ nguyên (bước sau sẽ refactor)
- `useWorkspaceBilling` — giữ nguyên
- `useAccountReadOnly`, `ReadOnlyGuard` — giữ nguyên
- Không sửa database, edge functions, hay migration
- Không sửa consumers (components dùng `usePlanLimits`) — backward compatible hoàn toàn
- `plan_limits` table structure — giữ nguyên, chỉ map columns sang keys mới

### Kết quả
Sau bước này, hệ thống có **3 engine trung tâm** theo cùng naming convention:
1. `src/lib/permissions.ts` — RBAC (`resource:role`) ✅ đã có
2. `src/lib/workspaceQuota.ts` — Quota + Feature (`resource:limit`, `resource:feature`) 🆕
3. `src/lib/planConfig.ts` — Plan metadata (prices, labels) ✅ đã có

