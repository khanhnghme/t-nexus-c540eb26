import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AccountLimits {
  // Current usage
  workspaceCount: number;
  totalProjects: number;
  uniqueMembers: number;
  storageMb: number;

  // Plan limits (null = unlimited) — already includes addon bonus
  maxWorkspaces: number | null;
  maxProjects: number | null;
  maxMembers: number | null;
  maxStorageMb: number | null;
  maxFileSizeMb: number | null;

  // Base limits (before addon)
  baseProjects: number | null;
  baseMembers: number | null;
  baseStorageMb: number | null;

  // Addon bonuses
  bonusProjects: number;
  bonusMembers: number;
  bonusStorageMb: number;

  // Helpers
  isLoading: boolean;
  canCreateWorkspace: boolean;
  canCreateProject: boolean;
  canInviteMember: (isExistingMember: boolean) => boolean;
  isOverLimits: boolean;
  refresh: () => void;
}

/**
 * Central hook for checking account-wide resource limits.
 * All limits are Global Pool (account-wide), not per-workspace.
 * Addon bonuses are included in the max* fields.
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
    baseProjects: null as number | null,
    baseMembers: null as number | null,
    baseStorageMb: null as number | null,
    bonusProjects: 0,
    bonusMembers: 0,
    bonusStorageMb: 0,
    isLoading: true,
  });

  const fetchLimits = useCallback(async () => {
    if (!user) return;

    try {
      const plan = profile?.user_plan || 'plan_free';

      const [
        limitsRes,
        wsCountRes,
        storageRes,
        uniqueMembersRes,
        addonRes,
      ] = await Promise.all([
        supabase.from('plan_limits').select('*').eq('plan', plan as any).maybeSingle(),
        supabase.from('workspaces').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.rpc('get_account_storage_usage', { _owner_id: user.id }),
        supabase.rpc('get_account_unique_members', { _owner_id: user.id }),
        supabase.rpc('get_owner_addon_bonus', { _owner_id: user.id }),
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
      const addonData = Array.isArray(addonRes.data) ? addonRes.data[0] : addonRes.data;
      const bonusProjects = addonData?.bonus_projects ?? 0;
      const bonusMembers = addonData?.bonus_members ?? 0;
      const bonusStorageMb = addonData?.bonus_storage_mb ?? 0;

      const baseProjects = limits?.max_projects_per_workspace ?? null;
      const baseMembers = limits?.max_members_per_workspace ?? null;
      const baseStorage = limits?.max_storage_mb ?? null;

      setState({
        workspaceCount: wsCountRes.count ?? 0,
        totalProjects,
        uniqueMembers: (uniqueMembersRes.data as number) ?? 0,
        storageMb: Math.round(Number(storageRes.data) || 0),
        maxWorkspaces: limits?.max_workspaces ?? null,
        maxProjects: baseProjects !== null ? baseProjects + bonusProjects : null,
        maxMembers: baseMembers !== null ? baseMembers + bonusMembers : null,
        maxStorageMb: baseStorage !== null ? baseStorage + bonusStorageMb : null,
        maxFileSizeMb: (limits as any)?.max_file_size_mb ?? null,
        baseProjects,
        baseMembers,
        baseStorageMb: baseStorage,
        bonusProjects,
        bonusMembers,
        bonusStorageMb,
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
    if (isExistingMember) return true;
    if (state.maxMembers === null) return true;
    return state.uniqueMembers < state.maxMembers;
  };

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
