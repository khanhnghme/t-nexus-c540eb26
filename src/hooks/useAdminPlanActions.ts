import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export type PlanActionType = 'upgrade' | 'downgrade' | 'extend' | 'suspend' | 'restore' | 'grant_trial';

export interface PlanActionParams {
  userId: string;
  action: PlanActionType;
  newPlan?: string;
  effectiveMode?: 'immediate' | 'next_cycle';
  extendDays?: number;
  reason: string;
  internalNote?: string;
  notifyUser?: boolean;
  currentPlan?: string;
  currentExpiresAt?: string | null;
}

export function useAdminPlanActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const executePlanAction = async (params: PlanActionParams) => {
    const { userId, action, newPlan, effectiveMode = 'immediate', extendDays, reason, internalNote, currentPlan, currentExpiresAt } = params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Server-side billing role validation
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, billing_role')
      .eq('user_id', user.id);

    const isOwner = roles?.some(r => r.role === 'system:owner');
    const isAdmin = roles?.some(r => r.role === 'system:admin' || r.role === 'system:owner');
    if (!isAdmin) throw new Error('Not authorized');

    const billingRole = isOwner ? 'billing_manager' : (roles?.[0]?.billing_role || 'billing_viewer');
    const dangerousActions = ['suspend', 'restore'];
    if (dangerousActions.includes(action) && billingRole !== 'billing_manager') {
      throw new Error('Insufficient billing permissions for this action');
    }
    if (billingRole === 'billing_viewer') {
      throw new Error('Billing viewers cannot perform plan actions');
    }

    // Build profile update based on action
    const profileUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
    let logNewPlan = newPlan || null;
    let logNewExpires: string | null = null;

    switch (action) {
      case 'upgrade':
        if (!newPlan) throw new Error('New plan required');
        profileUpdate.user_plan = newPlan;
        profileUpdate.plan = newPlan;
        profileUpdate.plan_status = 'active';
        profileUpdate.plan_source = 'admin_assigned';
        profileUpdate.plan_started_at = new Date().toISOString();
        // Clear any scheduled downgrade
        profileUpdate.next_plan = null;
        profileUpdate.next_billing_cycle = null;
        if (newPlan !== 'plan_free') {
          const expires = new Date();
          expires.setDate(expires.getDate() + 30);
          profileUpdate.plan_expires_at = expires.toISOString();
          logNewExpires = expires.toISOString();
        }
        break;

      case 'downgrade':
        if (!newPlan) throw new Error('New plan required');
        if (effectiveMode === 'immediate') {
          profileUpdate.user_plan = newPlan;
          profileUpdate.plan = newPlan;
          profileUpdate.plan_status = 'active';
          profileUpdate.plan_source = 'admin_assigned';
          profileUpdate.next_plan = null;
          profileUpdate.next_billing_cycle = null;
          if (newPlan === 'plan_free') {
            profileUpdate.plan_expires_at = null;
            profileUpdate.downgraded_at = new Date().toISOString();
          } else {
            const expires = new Date();
            expires.setDate(expires.getDate() + 30);
            profileUpdate.plan_expires_at = expires.toISOString();
            logNewExpires = expires.toISOString();
          }
        } else {
          profileUpdate.next_plan = newPlan;
          profileUpdate.next_billing_cycle = 'monthly';
          logNewPlan = newPlan;
        }
        break;

      case 'extend':
        if (!extendDays) throw new Error('Extend days required');
        const baseDate = currentExpiresAt ? new Date(currentExpiresAt) : new Date();
        baseDate.setDate(baseDate.getDate() + extendDays);
        profileUpdate.plan_expires_at = baseDate.toISOString();
        profileUpdate.plan_status = 'active';
        logNewExpires = baseDate.toISOString();
        logNewPlan = currentPlan || null;
        break;

      case 'suspend':
        profileUpdate.plan_status = 'suspended';
        logNewPlan = currentPlan || null;
        break;

      case 'restore':
        profileUpdate.plan_status = 'active';
        logNewPlan = currentPlan || null;
        break;

      case 'grant_trial':
        if (!newPlan) throw new Error('Trial plan required');
        profileUpdate.user_plan = newPlan;
        profileUpdate.plan = newPlan;
        profileUpdate.plan_status = 'trial';
        profileUpdate.plan_source = 'admin_assigned';
        profileUpdate.plan_started_at = new Date().toISOString();
        const trialExpires = new Date();
        trialExpires.setDate(trialExpires.getDate() + 14);
        profileUpdate.plan_expires_at = trialExpires.toISOString();
        logNewExpires = trialExpires.toISOString();
        break;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);
    if (profileError) throw profileError;

    // Insert plan_change_logs
    const { error: logError } = await supabase
      .from('plan_change_logs')
      .insert({
        user_id: userId,
        action_type: (action === 'downgrade' && newPlan !== 'plan_free') ? 'downgrade_scheduled' : action,
        old_plan: currentPlan || null,
        new_plan: logNewPlan,
        old_expires_at: currentExpiresAt || null,
        new_expires_at: logNewExpires,
        reason,
        internal_note: internalNote || null,
        performed_by: user.id,
        change_source: 'admin_manual',
        effective_mode: effectiveMode,
      });
    if (logError) throw logError;

    // If internal note provided, also save to admin_notes
    if (internalNote) {
      await supabase.from('admin_notes').insert({
        user_id: userId,
        created_by: user.id,
        content: `[${action.toUpperCase()}] ${internalNote}`,
        note_type: action === 'suspend' ? 'warning' : 'general',
      });
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['admin-billing-user', userId] });
    queryClient.invalidateQueries({ queryKey: ['admin-billing-usage', userId] });
    queryClient.invalidateQueries({ queryKey: ['admin-plan-history', userId] });
    queryClient.invalidateQueries({ queryKey: ['admin-notes', userId] });

    toast({ title: 'Success', description: `Plan action "${action}" applied successfully.` });
  };

  return { executePlanAction };
}
