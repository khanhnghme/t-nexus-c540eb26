import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AccountLimits {
  // Current usage
  workspaceCount: number;
  totalProjects: number;
  uniqueMembers: number;
  storageMb: number;

  // Plan limits (null = unlimited)
  maxWorkspaces: number | null;
  maxProjects: number | null;
  maxMembers: number | null;
  maxStorageMb: number | null;
  maxFileSizeMb: number | null;

  // Helpers
  isLoading: boolean;
  canCreateWorkspace: boolean;
  canCreateProject: boolean;
  canInviteMember: (isExistingMember: boolean) => boolean;
  isOverLimits: boolean; // for read-only check
  refresh: () => void;
}

/**
 * Central hook for checking account-wide resource limits.
 * All limits are Global Pool (account-wide), not per-workspace.
 */
export function useAccountLimitsCheck(): AccountLimits {
  const { user, profile } = useAuth();
  const [state, setState] = useState({
    workspaceCount: 0,
    totalProjects: 0,
    uniqueMembers: 0,
    storageMb: 0,
    maxWorkspaces: null as number | null,
    maxProjects: null as number | null,
    maxMembers: null as number | null,
    maxStorageMb: null as number | null,
    maxFileSizeMb: null as number | null,
    isLoading: true,
  });

  const fetchLimits = useCallback(async () => {
    if (!user) return;

    try {
      const plan = profile?.user_plan || 'plan_free';

      // Fetch limits + counts in parallel
      const [
        limitsRes,
        wsCountRes,
        storageRes,
        uniqueMembersRes,
      ] = await Promise.all([
        supabase.from('plan_limits').select('*').eq('plan', plan as any).maybeSingle(),
        supabase.from('workspaces').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.rpc('get_account_storage_usage', { _owner_id: user.id }),
        supabase.rpc('get_account_unique_members', { _owner_id: user.id }),
      ]);

      // Count total projects across all owned workspaces
      const { data: ownedWs } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id);
      
      let totalProjects = 0;
      if (ownedWs && ownedWs.length > 0) {
        const { count } = await supabase
          .from('groups')
          .select('id', { count: 'exact', head: true })
          .in('workspace_id', ownedWs.map(w => w.id));
        totalProjects = count ?? 0;
      }

      const limits = limitsRes.data;

      setState({
        workspaceCount: wsCountRes.count ?? 0,
        totalProjects,
        uniqueMembers: (uniqueMembersRes.data as number) ?? 0,
        storageMb: Math.round(Number(storageRes.data) || 0),
        maxWorkspaces: limits?.max_workspaces ?? null,
        maxProjects: limits?.max_projects_per_workspace ?? null,
        maxMembers: limits?.max_members_per_workspace ?? null,
        maxStorageMb: limits?.max_storage_mb ?? null,
        maxFileSizeMb: (limits as any)?.max_file_size_mb ?? null,
        isLoading: false,
      });
    } catch (err) {
      console.warn('Error fetching account limits:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, profile?.user_plan]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const canCreateWorkspace = state.maxWorkspaces === null || state.workspaceCount < state.maxWorkspaces;
  const canCreateProject = state.maxProjects === null || state.totalProjects < state.maxProjects;
  
  const canInviteMember = (isExistingMember: boolean) => {
    if (isExistingMember) return true; // Existing unique seat, no additional cost
    if (state.maxMembers === null) return true; // Unlimited
    return state.uniqueMembers < state.maxMembers;
  };

  // Check if current usage exceeds Free plan limits (for read-only enforcement after downgrade)
  const isOverLimits = (() => {
    if (state.maxWorkspaces !== null && state.workspaceCount > state.maxWorkspaces) return true;
    if (state.maxProjects !== null && state.totalProjects > state.maxProjects) return true;
    if (state.maxMembers !== null && state.uniqueMembers > state.maxMembers) return true;
    if (state.maxStorageMb !== null && state.storageMb > state.maxStorageMb) return true;
    return false;
  })();

  return {
    ...state,
    canCreateWorkspace,
    canCreateProject,
    canInviteMember,
    isOverLimits,
    refresh: fetchLimits,
  };
}
