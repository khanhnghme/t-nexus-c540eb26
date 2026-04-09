import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface WorkspaceBilling {
  ownerPlan: string | null;
  ownerName: string | null;
  ownerId: string | null;
  projectCount: number;
  maxProjects: number | null;
  isLoading: boolean;
}

/**
 * Fetches cascading billing info for the active workspace:
 * - Owner's plan name (from profiles.user_plan via owner_id)
 * - Owner's display name
 * - Total project count across ALL workspaces owned by this owner (account-wide)
 * - Max projects limit from plan_limits (null = UNLIMITED, account-wide total)
 */
export function useWorkspaceBilling(): WorkspaceBilling {
  const { activeWorkspace } = useWorkspace();
  const [billing, setBilling] = useState<WorkspaceBilling>({
    ownerPlan: null,
    ownerName: null,
    ownerId: null,
    projectCount: 0,
    maxProjects: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!activeWorkspace) {
      setBilling(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchBilling = async () => {
      try {
        const [planRes, ownerRes] = await Promise.all([
          supabase.rpc('get_workspace_plan', { _workspace_id: activeWorkspace.id }),
          supabase.from('profiles').select('id, full_name, user_plan').eq('id', activeWorkspace.owner_id).maybeSingle(),
        ]);

        const planText = planRes.data as string | null;

        // Count total projects across ALL workspaces owned by this owner (Global Pool)
        const { data: ownerWorkspaces } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', activeWorkspace.owner_id);

        const ownerWsIds = ownerWorkspaces?.map(w => w.id) ?? [];
        let totalProjectCount = 0;

        if (ownerWsIds.length > 0) {
          const { count } = await supabase
            .from('groups')
            .select('id', { count: 'exact', head: true })
            .in('workspace_id', ownerWsIds);
          totalProjectCount = count ?? 0;
        }

        // Get limits from plan_limits table
        let maxProjects: number | null = null;
        if (planText) {
          const { data: limitsData } = await supabase
            .from('plan_limits')
            .select('max_projects_per_workspace')
            .eq('plan', planText as any)
            .maybeSingle();
          maxProjects = limitsData?.max_projects_per_workspace ?? null;
        }

        setBilling({
          ownerPlan: planText,
          ownerName: ownerRes.data?.full_name ?? null,
          ownerId: activeWorkspace.owner_id,
          projectCount: totalProjectCount,
          maxProjects,
          isLoading: false,
        });
      } catch (err) {
        console.warn('Error fetching workspace billing:', err);
        setBilling(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchBilling();
  }, [activeWorkspace?.id, activeWorkspace?.owner_id]);

  return billing;
}

// Re-export from central config for backward compatibility
export { getPlanLabel as formatPlanName } from '@/lib/planConfig';
