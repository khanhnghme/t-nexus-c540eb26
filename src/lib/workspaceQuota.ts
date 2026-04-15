/**
 * Workspace Quota & Feature Engine
 * Central definitions for quota limits (resource:limit) and feature flags (resource:feature).
 * Maps plan_limits DB columns → standardized keys following resource:* convention.
 *
 * Architecture:
 *   permissions.ts  → RBAC      (resource:role)
 *   workspaceQuota.ts → Quota/Feature (resource:limit, resource:feature)
 *   planConfig.ts   → Plan metadata (prices, labels)
 */

// ─── Quota Keys (resource:limit) ───────────────────────────────────────────────
export type QuotaKey =
  | 'workspace:limit_count'        // max workspaces per owner
  | 'workspace:limit_projects'     // max projects (total across workspaces)
  | 'workspace:limit_members'      // max unique members (seats)
  | 'workspace:limit_storage_mb'   // max storage in MB
  | 'workspace:limit_file_size_mb' // max single file size in MB
  | 'workspace:limit_meeting_min'  // max meeting duration in minutes
  | 'workspace:limit_log_days'     // max activity log retention days
  | 'workspace:limit_ai_messages'  // max AI messages per day (deprecated)
  | 'workspace:limit_ai_credits';  // max AI credits per month

// ─── Feature Keys (resource:feature) ───────────────────────────────────────────
export type FeatureKey =
  | 'workspace:feature_export'     // can export data (PDF, Excel, ZIP)
  | 'workspace:feature_ai';        // AI assistant (future)

// ─── Column mapping: plan_limits table → QuotaKey ──────────────────────────────
const QUOTA_COLUMN_MAP: Record<QuotaKey, string> = {
  'workspace:limit_count': 'max_workspaces',
  'workspace:limit_projects': 'max_projects_per_workspace',
  'workspace:limit_members': 'max_members_per_workspace',
  'workspace:limit_storage_mb': 'max_storage_mb',
  'workspace:limit_file_size_mb': 'max_file_size_mb',
  'workspace:limit_meeting_min': 'max_meeting_duration_minutes',
  'workspace:limit_log_days': 'max_activity_log_days',
  'workspace:limit_ai_messages': 'max_ai_messages_per_month',
  'workspace:limit_ai_credits': 'max_ai_credits_per_month',
};

// ─── Column mapping: plan_limits table → FeatureKey ────────────────────────────
const FEATURE_COLUMN_MAP: Record<FeatureKey, string> = {
  'workspace:feature_export': 'can_export_data',
  'workspace:feature_ai': 'can_use_ai', // future column — defaults to false
};

// ─── Addon-eligible quotas (keys that can receive bonus from addons) ───────────
export const ADDON_ELIGIBLE_QUOTAS: QuotaKey[] = [
  'workspace:limit_projects',
  'workspace:limit_members',
  'workspace:limit_storage_mb',
];

// ─── Helper functions ──────────────────────────────────────────────────────────

/**
 * Get raw quota limit from plan_limits row data.
 * Returns null if the column is null/undefined → means UNLIMITED.
 */
export function getQuotaFromPlan(planData: Record<string, any> | null, key: QuotaKey): number | null {
  if (!planData) return null;
  const col = QUOTA_COLUMN_MAP[key];
  const val = planData[col];
  return val != null ? Number(val) : null;
}

/**
 * Check if a feature is enabled in the plan.
 * Defaults to false if column is missing.
 */
export function hasFeatureInPlan(planData: Record<string, any> | null, key: FeatureKey): boolean {
  if (!planData) return false;
  const col = FEATURE_COLUMN_MAP[key];
  return Boolean(planData[col]);
}

/**
 * Check if current usage exceeds a limit.
 * If limit is null → UNLIMITED → never exceeded.
 */
export function isQuotaExceeded(current: number, limit: number | null): boolean {
  if (limit === null) return false;
  return current >= limit;
}

/**
 * Calculate effective quota = base + addon bonus.
 * If base is null → UNLIMITED → addon is irrelevant → returns null.
 */
export function effectiveQuota(base: number | null, bonus: number): number | null {
  if (base === null) return null;
  return base + bonus;
}

/**
 * Get all quota column names (for DB queries).
 */
export function getQuotaColumns(): string[] {
  return Object.values(QUOTA_COLUMN_MAP);
}

/**
 * Get all feature column names (for DB queries).
 */
export function getFeatureColumns(): string[] {
  return Object.values(FEATURE_COLUMN_MAP);
}
