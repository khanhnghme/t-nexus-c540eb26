import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useProjectViews() {
  const { user } = useAuth();
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStarred = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('starred_projects')
      .select('group_id')
      .eq('user_id', user.id);
    setStarredIds(new Set((data || []).map(d => d.group_id)));
  }, [user]);

  const fetchRecent = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('project_access_log')
      .select('group_id')
      .eq('user_id', user.id)
      .order('accessed_at', { ascending: false })
      .limit(10);
    setRecentIds((data || []).map(d => d.group_id));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([fetchStarred(), fetchRecent()]).finally(() => setIsLoading(false));
  }, [user, fetchStarred, fetchRecent]);

  const toggleStar = useCallback(async (groupId: string) => {
    if (!user) return;
    const isStarred = starredIds.has(groupId);
    // Optimistic update
    setStarredIds(prev => {
      const next = new Set(prev);
      if (isStarred) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

    if (isStarred) {
      await supabase
        .from('starred_projects')
        .delete()
        .eq('user_id', user.id)
        .eq('group_id', groupId);
    } else {
      await supabase
        .from('starred_projects')
        .insert({ user_id: user.id, group_id: groupId });
    }
  }, [user, starredIds]);

  const logAccess = useCallback(async (groupId: string) => {
    if (!user) return;
    await supabase
      .from('project_access_log')
      .upsert(
        { user_id: user.id, group_id: groupId, accessed_at: new Date().toISOString() },
        { onConflict: 'user_id,group_id' }
      );
  }, [user]);

  return {
    starredIds,
    recentIds,
    isLoading,
    toggleStar,
    logAccess,
    refetch: () => Promise.all([fetchStarred(), fetchRecent()]),
  };
}
