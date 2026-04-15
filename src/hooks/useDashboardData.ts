import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Group } from '@/types/database';

interface DashboardDataResult {
  groups: Group[];
  ownedProjectCount: number;
  joinedProjectCount: number;
}

async function fetchDashboardDataFn(userId: string, workspaceId?: string | null, wsAvailable?: boolean): Promise<DashboardDataResult> {
  const { data: memberData, error: memberError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (memberError) throw memberError;

  const groupIds = memberData?.map((m) => m.group_id) || [];

  if (groupIds.length === 0) {
    return { groups: [], ownedProjectCount: 0, joinedProjectCount: memberData?.length || 0 };
  }

  let query = supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: false });

  if (wsAvailable && workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: groupsData, error: groupsError } = await query;
  if (groupsError) throw groupsError;

  const allGroups = (groupsData || []) as Group[];
  return {
    groups: allGroups,
    ownedProjectCount: allGroups.filter(g => g.created_by === userId).length,
    joinedProjectCount: memberData?.length || 0,
  };
}

export function useDashboardData(userId: string | undefined, workspaceId?: string | null, wsAvailable?: boolean) {
  return useQuery({
    queryKey: ['dashboard-data', userId, workspaceId],
    queryFn: () => fetchDashboardDataFn(userId!, workspaceId, wsAvailable),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

async function fetchHiddenProjectsFn(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('hidden_projects')
    .select('group_id')
    .eq('user_id', userId);
  return new Set(data?.map(d => d.group_id) || []);
}

export function useHiddenProjects(userId: string | undefined) {
  return useQuery({
    queryKey: ['hidden-projects', userId],
    queryFn: () => fetchHiddenProjectsFn(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

async function fetchPendingApprovalsFn(userId: string): Promise<Group[]> {
  const { data } = await supabase
    .from('pending_approvals')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (data && data.length > 0) {
    const groupIds = data.map(d => d.group_id);
    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);
    return (groupsData || []) as Group[];
  }
  return [];
}

export function usePendingApprovals(userId: string | undefined) {
  return useQuery({
    queryKey: ['pending-approvals', userId],
    queryFn: () => fetchPendingApprovalsFn(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

async function fetchRecentProjectsFn(userId: string, allGroups: Group[]): Promise<Group[]> {
  // Try project_access_log first
  const { data: accessLogs } = await supabase
    .from('project_access_log')
    .select('group_id')
    .eq('user_id', userId)
    .order('accessed_at', { ascending: false })
    .limit(5);

  if (accessLogs && accessLogs.length > 0) {
    const orderedIds = accessLogs.map(l => l.group_id);
    const groupMap = new Map(allGroups.map(g => [g.id, g]));
    return orderedIds
      .map(id => groupMap.get(id))
      .filter((g): g is Group => !!g);
  }

  // Fallback: 5 newest groups
  return allGroups.slice(0, 5);
}

export function useRecentProjects(userId: string | undefined, allGroups: Group[]) {
  return useQuery({
    queryKey: ['recent-projects', userId, allGroups.map(g => g.id).join(',')],
    queryFn: () => fetchRecentProjectsFn(userId!, allGroups),
    enabled: !!userId && allGroups.length > 0,
    staleTime: 30_000,
  });
}

interface VideoSettings {
  enabled: boolean;
  opacity: number;
  url: string;
}

async function fetchVideoSettingsFn(): Promise<VideoSettings> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'dashboard_video_bg')
    .maybeSingle();
  if (data?.value) {
    const val = data.value as { enabled?: boolean; dashboard_opacity?: number; opacity?: number; url?: string };
    return {
      enabled: val.enabled ?? false,
      opacity: val.dashboard_opacity ?? val.opacity ?? 0.2,
      url: val.url ?? '',
    };
  }
  return { enabled: false, opacity: 0.2, url: '' };
}

export function useVideoSettings() {
  return useQuery({
    queryKey: ['dashboard-video-settings'],
    queryFn: fetchVideoSettingsFn,
    staleTime: 60_000,
  });
}
