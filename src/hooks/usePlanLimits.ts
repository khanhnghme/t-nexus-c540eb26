import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface PlanLimits {
  maxWorkspaces: number | null;
  maxTotalProjects: number | null;
  maxTotalMembers: number | null;
  maxStorageMb: number | null;
  isLoading: boolean;
}

/**
 * Hook to fetch plan limits for the active workspace's owner plan.
 * Returns null for any limit = UNLIMITED (no restriction).
 * Cascading billing: limits come from workspace owner's plan.
 * 
 * Note: All limits are ACCOUNT-WIDE totals (Global Resource Pool),
 * not per-workspace. DB columns are named `max_projects_per_workspace`
 * but the actual meaning is total across all workspaces.
 */
export function usePlanLimits(): PlanLimits {
  const { activeWorkspace } = useWorkspace();
  const [limits, setLimits] = useState<PlanLimits>({
    maxWorkspaces: null,
    maxTotalProjects: null,
    maxTotalMembers: null,
    maxStorageMb: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!activeWorkspace) {
      setLimits(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchLimits = async () => {
      try {
        const { data: planText } = await supabase.rpc('get_workspace_plan', {
          _workspace_id: activeWorkspace.id,
        });

        if (!planText) {
          setLimits(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const { data: planData } = await supabase
          .from('plan_limits')
          .select('*')
          .eq('plan', planText as any)
          .maybeSingle();

        setLimits({
          maxWorkspaces: planData?.max_workspaces ?? null,
          maxTotalProjects: planData?.max_projects_per_workspace ?? null,
          maxTotalMembers: planData?.max_members_per_workspace ?? null,
          maxStorageMb: planData?.max_storage_mb ?? null,
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
