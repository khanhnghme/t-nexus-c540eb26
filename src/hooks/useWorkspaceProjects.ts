import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface WorkspaceProject {
  id: string;
  name: string;
  slug: string | null;
  visibility: string;
  project_mode: string;
  isMember: boolean;
}

export function useWorkspaceProjects() {
  const { user } = useAuth();
  const { activeWorkspace, isAvailable, workspaceRole } = useWorkspace();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user || !isAvailable || !activeWorkspace) {
      setProjects([]);
      return;
    }

    setIsLoading(true);

    // 1. Get groups where user is a member in this workspace
    const { data: memberData } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    const joinedIds = new Set((memberData || []).map(m => m.group_id));

    // 2. Get joined projects in this workspace
    let joinedProjects: WorkspaceProject[] = [];
    if (joinedIds.size > 0) {
      const { data } = await supabase
        .from('groups')
        .select('id, name, slug, visibility, project_mode')
        .in('id', Array.from(joinedIds))
        .eq('workspace_id', activeWorkspace.id)
        .order('name');
      joinedProjects = (data || []).map(g => ({ ...g, isMember: true }));
    }

    // 3. If user is a WS member (not guest), also fetch workspace_public / public_link projects
    let publicProjects: WorkspaceProject[] = [];
    if (workspaceRole) {
      const { data } = await supabase
        .from('groups')
        .select('id, name, slug, visibility, project_mode')
        .eq('workspace_id', activeWorkspace.id)
        .in('visibility', ['workspace_public', 'public_link'])
        .order('name');
      publicProjects = (data || [])
        .filter(g => !joinedIds.has(g.id))
        .map(g => ({ ...g, isMember: false }));
    }

    // Deduplicate by id
    const allProjects = [...joinedProjects, ...publicProjects];
    const uniqueMap = new Map(allProjects.map(p => [p.id, p]));
    setProjects(Array.from(uniqueMap.values()));
    setIsLoading(false);
  }, [user, activeWorkspace, isAvailable, workspaceRole]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Realtime subscription for auto-refresh
  useEffect(() => {
    if (!activeWorkspace?.id) return;

    const channel = supabase
      .channel(`workspace-projects-${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
          filter: `workspace_id=eq.${activeWorkspace.id}`,
        },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWorkspace?.id, fetchProjects]);

  const isGuest = isAvailable && !!activeWorkspace && !workspaceRole;

  return { projects, isLoading, isGuest, refreshProjects: fetchProjects };
}
