import { useAuth } from '@/contexts/AuthContext';
import { useAccountLimitsCheck } from './useAccountLimitsCheck';

/**
 * Hook to determine if the account is in read-only mode.
 * This happens when a user downgrades to Free but their data exceeds Free limits.
 * In this state, they can only view and delete data — no creating/editing.
 */
export function useAccountReadOnly() {
  const { profile } = useAuth();
  const limits = useAccountLimitsCheck();

  const plan = profile?.user_plan || 'plan_free';
  const isFree = plan === 'plan_free';
  
  // Read-only mode: user is on Free plan AND their usage exceeds Free limits
  const isReadOnly = isFree && !limits.isLoading && limits.isOverLimits;

  // Grace period: check if downgraded_at exists and calculate days remaining
  const downgradadedAt = (profile as any)?.downgraded_at 
    ? new Date((profile as any).downgraded_at) 
    : null;
  
  let graceDaysRemaining: number | null = null;
  if (downgradadedAt && isReadOnly) {
    const daysSinceDowngrade = Math.floor(
      (Date.now() - downgradadedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    graceDaysRemaining = Math.max(0, 30 - daysSinceDowngrade);
  }

  return {
    isReadOnly,
    isLoading: limits.isLoading,
    graceDaysRemaining,
    downgradadedAt,
    // Expose usage details for the banner
    workspaceCount: limits.workspaceCount,
    maxWorkspaces: limits.maxWorkspaces,
    totalProjects: limits.totalProjects,
    maxProjects: limits.maxProjects,
    uniqueMembers: limits.uniqueMembers,
    maxMembers: limits.maxMembers,
    storageMb: limits.storageMb,
    maxStorageMb: limits.maxStorageMb,
  };
}
