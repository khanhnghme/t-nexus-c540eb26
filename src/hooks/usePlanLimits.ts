import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  QuotaKey,
  FeatureKey,
  getQuotaFromPlan,
  hasFeatureInPlan,
  isQuotaExceeded as _isQuotaExceeded,
  effectiveQuota,
} from '@/lib/workspaceQuota';

interface PlanLimits {
  maxWorkspaces: number | null;
  maxTotalProjects: number | null;
  maxTotalMembers: number | null;
  maxStorageMb: number | null;
  maxMeetingDurationMinutes: number | null;
  maxActivityLogDays: number | null;
  canExportData: boolean;
  // Addon bonuses
  bonusProjects: number;
  bonusMembers: number;
  bonusStorageMb: number;
  // Base limits (before addon)
  baseTotalProjects: number | null;
  baseTotalMembers: number | null;
  baseStorageMb: number | null;
  isLoading: boolean;
  // ─── New unified API ────────────────────────────────
  /** Get quota limit by standardized key (includes addon bonus where applicable) */
  getQuota: (key: QuotaKey) => number | null;
  /** Check if a feature is enabled in the workspace plan */
  hasFeature: (key: FeatureKey) => boolean;
}

/**
 * Hook to fetch plan limits for the active workspace's owner plan.
 * Returns null for any limit = UNLIMITED (no restriction).
 * Cascading billing: limits come from workspace owner's plan.
 * Addon bonuses are added to base limits.
 */
export function usePlanLimits(): PlanLimits {
  const { activeWorkspace } = useWorkspace();
  const [planData, setPlanData] = useState<Record<string, any> | null>(null);
  const [bonuses, setBonuses] = useState({ projects: 0, members: 0, storageMb: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) {
      setIsLoading(false);
      return;
    }

    const fetchLimits = async () => {
      try {
        const ownerId = activeWorkspace.owner_id;

        const [planTextRes, addonRes] = await Promise.all([
          supabase.rpc('get_workspace_plan', { _workspace_id: activeWorkspace.id }),
          ownerId
            ? supabase.rpc('get_owner_addon_bonus', { _owner_id: ownerId })
            : Promise.resolve({ data: null }),
        ]);

        const planText = planTextRes.data;
        if (!planText) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from('plan_limits')
          .select('*')
          .eq('plan', planText as any)
          .maybeSingle();

        const addonData = Array.isArray(addonRes.data) ? addonRes.data[0] : addonRes.data;
        setBonuses({
          projects: addonData?.bonus_projects ?? 0,
          members: addonData?.bonus_members ?? 0,
          storageMb: addonData?.bonus_storage_mb ?? 0,
        });
        setPlanData(data);
        setIsLoading(false);
      } catch (err) {
        console.warn('Error fetching plan limits:', err);
        setIsLoading(false);
      }
    };

    fetchLimits();
  }, [activeWorkspace?.id]);

  // ─── Derived values (backward compatible) ─────────────────────────
  const baseProjects = getQuotaFromPlan(planData, 'workspace:limit_projects');
  const baseMembers = getQuotaFromPlan(planData, 'workspace:limit_members');
  const baseStorage = getQuotaFromPlan(planData, 'workspace:limit_storage_mb');

  // ─── Unified getQuota (includes addon bonus) ──────────────────────
  const getQuota = (key: QuotaKey): number | null => {
    const base = getQuotaFromPlan(planData, key);
    // Apply addon bonus for eligible keys
    if (key === 'workspace:limit_projects') return effectiveQuota(base, bonuses.projects);
    if (key === 'workspace:limit_members') return effectiveQuota(base, bonuses.members);
    if (key === 'workspace:limit_storage_mb') return effectiveQuota(base, bonuses.storageMb);
    return base;
  };

  const hasFeature = (key: FeatureKey): boolean => hasFeatureInPlan(planData, key);

  return {
    maxWorkspaces: getQuotaFromPlan(planData, 'workspace:limit_count'),
    maxTotalProjects: effectiveQuota(baseProjects, bonuses.projects),
    maxTotalMembers: effectiveQuota(baseMembers, bonuses.members),
    maxStorageMb: effectiveQuota(baseStorage, bonuses.storageMb),
    maxMeetingDurationMinutes: getQuotaFromPlan(planData, 'workspace:limit_meeting_min'),
    maxActivityLogDays: getQuotaFromPlan(planData, 'workspace:limit_log_days'),
    canExportData: hasFeatureInPlan(planData, 'workspace:feature_export'),
    bonusProjects: bonuses.projects,
    bonusMembers: bonuses.members,
    bonusStorageMb: bonuses.storageMb,
    baseTotalProjects: baseProjects,
    baseTotalMembers: baseMembers,
    baseStorageMb: baseStorage,
    isLoading,
    getQuota,
    hasFeature,
  };
}

/**
 * Check if a count exceeds a limit.
 * If limit is null → UNLIMITED → always returns false (not exceeded).
 */
export function isLimitExceeded(current: number, limit: number | null): boolean {
  return _isQuotaExceeded(current, limit);
}
