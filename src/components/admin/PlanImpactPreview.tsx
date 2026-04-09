import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  userId: string;
  currentPlan: string;
  newPlan: string;
}

export function PlanImpactPreview({ userId, currentPlan, newPlan }: Props) {
  const { data: currentLimits } = useQuery({
    queryKey: ['plan-limits', currentPlan],
    queryFn: async () => {
      const { data } = await supabase.from('plan_limits').select('*').eq('plan', currentPlan as any).single();
      return data;
    },
  });

  const { data: newLimits } = useQuery({
    queryKey: ['plan-limits', newPlan],
    queryFn: async () => {
      const { data } = await supabase.from('plan_limits').select('*').eq('plan', newPlan as any).single();
      return data;
    },
  });

  const { data: usage } = useQuery({
    queryKey: ['admin-billing-usage', userId],
    queryFn: async () => {
      const [wsRes, membersRes, storageRes] = await Promise.all([
        supabase.from('workspaces' as any).select('id', { count: 'exact', head: true }).eq('owner_id', userId),
        supabase.rpc('get_account_unique_members', { _owner_id: userId }),
        supabase.rpc('get_account_storage_usage', { _owner_id: userId }),
      ]);

      // Count total projects across all owned workspaces
      const wsIds: string[] = [];
      if ((wsRes as any).count > 0) {
        const { data: wsData } = await supabase.from('workspaces' as any).select('id').eq('owner_id', userId);
        if (wsData) wsData.forEach((w: any) => wsIds.push(w.id));
      }
      let totalProjects = 0;
      if (wsIds.length > 0) {
        const { count } = await supabase.from('groups').select('id', { count: 'exact', head: true }).in('workspace_id', wsIds);
        totalProjects = count || 0;
      }

      return {
        workspaces: (wsRes as any).count || 0,
        projects: totalProjects,
        members: (membersRes.data as number) || 0,
        storageMb: Math.round((storageRes.data as number) || 0),
      };
    },
  });

  if (!currentLimits || !newLimits || !usage) {
    return <div className="text-sm text-muted-foreground py-3">Loading impact analysis...</div>;
  }

  const items = [
    { label: 'Workspaces', current: currentLimits.max_workspaces, next: newLimits.max_workspaces, used: usage.workspaces },
    { label: 'Projects (Total)', current: currentLimits.max_projects_per_workspace, next: newLimits.max_projects_per_workspace, used: usage.projects },
    { label: 'Members (Total)', current: currentLimits.max_members_per_workspace, next: newLimits.max_members_per_workspace, used: usage.members },
    { label: 'Storage (MB)', current: currentLimits.max_storage_mb, next: newLimits.max_storage_mb, used: usage.storageMb },
  ];

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Impact Preview
      </h4>
      <div className="grid grid-cols-4 gap-1 text-xs font-medium text-muted-foreground border-b pb-2">
        <span>Resource</span><span>Current</span><span>New</span><span>Usage</span>
      </div>
      {items.map(item => {
        const isOver = item.used > item.next;
        return (
          <div key={item.label} className={`grid grid-cols-4 gap-1 text-sm py-1 rounded px-1 ${isOver ? 'bg-destructive/10' : ''}`}>
            <span className="font-medium">{item.label}</span>
            <span>{item.current}</span>
            <span className={isOver ? 'text-destructive font-semibold' : 'text-emerald-600 dark:text-emerald-400'}>{item.next}</span>
            <span className="flex items-center gap-1">
              {item.used}
              {isOver ? <AlertTriangle className="h-3 w-3 text-destructive" /> : <CheckCircle className="h-3 w-3 text-emerald-500" />}
            </span>
          </div>
        );
      })}
      {items.some(i => i.used > i.next) && (
        <p className="text-xs text-destructive font-medium mt-2">
          ⚠ User's current usage exceeds new plan limits. Account will enter read-only mode for over-limit resources.
        </p>
      )}
    </div>
  );
}
