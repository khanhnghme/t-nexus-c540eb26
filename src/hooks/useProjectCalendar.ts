import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarEvent } from '@/types/calendar';

export function useProjectCalendar(groupId: string | undefined) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['project-calendar', groupId],
    enabled: !!groupId && !!user,
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!groupId) return [];

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, slug, status, deadline, extended_deadline, groups:group_id(name, slug)')
        .eq('group_id', groupId)
        .not('deadline', 'is', null);

      if (error) throw error;

      return (tasks || [])
        .filter(t => t.deadline)
        .map(task => {
          const group = task.groups as any;
          const effectiveDeadline = task.extended_deadline || task.deadline;

          return {
            id: task.id,
            title: task.title,
            date: new Date(effectiveDeadline!),
            type: 'task' as const,
            projectName: group?.name || '',
            projectSlug: group?.slug || '',
            projectId: groupId,
            taskSlug: task.slug,
            taskStatus: task.status as CalendarEvent['taskStatus'],
          };
        });
    },
  });

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
