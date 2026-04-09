import { supabase } from '@/integrations/supabase/client';

interface LogActivityParams {
  userId: string;
  userName: string;
  action: string;
  actionType: 'project_member' | 'task' | 'stage' | 'resource' | 'score' | 'project' | 'setting' | 'system' | 'meeting';
  description: string;
  groupId?: string;
  metadata?: Record<string, any>;
}

/**
 * Get the max_activity_log_days for a group's workspace owner plan.
 * Returns: number (0 = no logging, >0 = days to keep), null = unlimited
 */
async function getActivityLogDaysLimit(groupId: string): Promise<number | null> {
  try {
    // group → workspace → owner → plan → plan_limits.max_activity_log_days
    const { data: group } = await supabase
      .from('groups')
      .select('workspace_id')
      .eq('id', groupId)
      .single();

    if (!group?.workspace_id) return null; // no workspace → unlimited

    const { data: planText } = await supabase.rpc('get_workspace_plan', {
      _workspace_id: group.workspace_id,
    });

    if (!planText) return null;

    const { data: planData } = await supabase
      .from('plan_limits')
      .select('max_activity_log_days')
      .eq('plan', planText as any)
      .maybeSingle();

    // If column value is undefined/null → unlimited
    return (planData as any)?.max_activity_log_days ?? null;
  } catch {
    return null; // on error, default unlimited
  }
}

export async function logActivity({
  userId,
  userName,
  action,
  actionType,
  description,
  groupId,
  metadata,
}: LogActivityParams) {
  try {
    // If groupId is provided, check if activity logging is enabled for that group
    if (groupId) {
      const { data: groupData } = await supabase
        .from('groups')
        .select('activity_logging_enabled')
        .eq('id', groupId)
        .single();
      if (groupData && groupData.activity_logging_enabled === false) {
        return; // Logging is disabled for this group, skip
      }

      // Check plan limit for activity log days
      const maxDays = await getActivityLogDaysLimit(groupId);
      if (maxDays === 0) {
        return; // Free plan — no logging allowed
      }

      // Insert the log
      await supabase.from('activity_logs').insert({
        user_id: userId,
        user_name: userName,
        action,
        action_type: actionType,
        description,
        group_id: groupId,
        metadata: metadata || null,
      });

      // Auto-delete old logs if there's a day limit
      if (maxDays !== null && maxDays > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - maxDays);
        await supabase
          .from('activity_logs')
          .delete()
          .eq('group_id', groupId)
          .lt('created_at', cutoff.toISOString());
      }

      return;
    }

    // No groupId — just insert (system-level logs, no limit check)
    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_name: userName,
      action,
      action_type: actionType,
      description,
      group_id: null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
