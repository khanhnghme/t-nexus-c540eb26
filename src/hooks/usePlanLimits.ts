import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

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
}

/**
 * Hook to fetch plan limits for the active workspace's owner plan.
 * Returns null for any limit = UNLIMITED (no restriction).
 * Cascading billing: limits come from workspace owner's plan.
 * Addon bonuses are added to base limits.
 */
export function usePlanLimits(): PlanLimits {
  const { activeWorkspace } = useWorkspace();
  const [limits, setLimits] = useState<PlanLimits>({
    maxWorkspaces: null,
    maxTotalProjects: null,
    maxTotalMembers: null,
    maxStorageMb: null,
    maxMeetingDurationMinutes: null,
    maxActivityLogDays: null,
    canExportData: false,
    bonusProjects: 0,
    bonusMembers: 0,
    bonusStorageMb: 0,
    baseTotalProjects: null,
    baseTotalMembers: null,
    baseStorageMb: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!activeWorkspace) {
      setLimits(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchLimits = async () => {
      try {
        // Get workspace owner id
        const ownerId = activeWorkspace.owner_id;

        const [planTextRes, addonRes] = await Promise.all([
          supabase.rpc('get_workspace_plan', { _workspace_id: activeWorkspace.id }),
          ownerId
            ? supabase.rpc('get_owner_addon_bonus', { _owner_id: ownerId })
            : Promise.resolve({ data: null }),
        ]);

        const planText = planTextRes.data;
        if (!planText) {
          setLimits(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const { data: planData } = await supabase
          .from('plan_limits')
          .select('*')
          .eq('plan', planText as any)
          .maybeSingle();

        const addonData = Array.isArray(addonRes.data) ? addonRes.data[0] : addonRes.data;
        const bonusProjects = addonData?.bonus_projects ?? 0;
        const bonusMembers = addonData?.bonus_members ?? 0;
        const bonusStorageMb = addonData?.bonus_storage_mb ?? 0;

        const baseProjects = planData?.max_projects_per_workspace ?? null;
        const baseMembers = planData?.max_members_per_workspace ?? null;
        const baseStorage = planData?.max_storage_mb ?? null;

        setLimits({
          maxWorkspaces: planData?.max_workspaces ?? null,
          maxTotalProjects: baseProjects !== null ? baseProjects + bonusProjects : null,
          maxTotalMembers: baseMembers !== null ? baseMembers + bonusMembers : null,
          maxStorageMb: baseStorage !== null ? baseStorage + bonusStorageMb : null,
          maxMeetingDurationMinutes: planData?.max_meeting_duration_minutes ?? null,
          maxActivityLogDays: planData?.max_activity_log_days ?? null,
          canExportData: planData?.can_export_data ?? false,
          bonusProjects,
          bonusMembers,
          bonusStorageMb,
          baseTotalProjects: baseProjects,
          baseTotalMembers: baseMembers,
          baseStorageMb: baseStorage,
          isLoading: false,
        });
      } catch (err) {
        console.warn('Error fetching plan limits:', err);
        setLimits(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchLimits();
  }, [activeWorkspace?.id]);

  return limits;
}

/**
 * Check if a count exceeds a limit.
 * If limit is null → UNLIMITED → always returns false (not exceeded).
 */
export function isLimitExceeded(current: number, limit: number | null): boolean {
  if (limit === null) return false;
  return current >= limit;
}
