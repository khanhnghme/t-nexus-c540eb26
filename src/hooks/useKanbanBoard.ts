import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useReadOnlyGuard } from '@/components/ReadOnlyGuard';
import { TaskStatus } from '@/types/database';

export interface KanbanTask {
  id: string;
  short_id: string | null;
  title: string;
  status: TaskStatus;
  deadline: string | null;
  extended_deadline: string | null;
  stage_name: string | null;
  is_hidden: boolean | null;
  assignees: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  }[];
}

const KANBAN_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'VERIFIED'];

export function useKanbanBoard(groupId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { guardAction } = useReadOnlyGuard();

  const query = useQuery({
    queryKey: ['kanban', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<KanbanTask[]> => {
      if (!groupId) return [];

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, short_id, title, status, deadline, extended_deadline, stage_id, is_hidden')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      if (!tasks?.length) return [];

      const taskIds = tasks.map(t => t.id);

      const [assignmentsRes, stagesRes] = await Promise.all([
        supabase
          .from('task_assignments')
          .select('task_id, user_id, profiles:user_id(full_name, avatar_url)')
          .in('task_id', taskIds),
        supabase
          .from('stages')
          .select('id, name')
          .eq('group_id', groupId),
      ]);

      const stageMap = new Map((stagesRes.data || []).map(s => [s.id, s.name]));

      const assignmentsByTask = new Map<string, KanbanTask['assignees']>();
      for (const a of assignmentsRes.data || []) {
        const profile = a.profiles as any;
        const list = assignmentsByTask.get(a.task_id) || [];
        list.push({
          user_id: a.user_id,
          full_name: profile?.full_name || '',
          avatar_url: profile?.avatar_url || null,
        });
        assignmentsByTask.set(a.task_id, list);
      }

      return tasks.map(task => ({
        id: task.id,
        short_id: task.short_id,
        title: task.title,
        status: task.status as TaskStatus,
        deadline: task.deadline,
        extended_deadline: task.extended_deadline,
        stage_name: task.stage_id ? stageMap.get(task.stage_id) || null : null,
        is_hidden: task.is_hidden,
        assignees: assignmentsByTask.get(task.id) || [],
      }));
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: TaskStatus }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      if (error) throw error;
    },
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['kanban', groupId] });
      const previous = queryClient.getQueryData<KanbanTask[]>(['kanban', groupId]);
      queryClient.setQueryData<KanbanTask[]>(['kanban', groupId], old =>
        old?.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['kanban', groupId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', groupId] });
      queryClient.invalidateQueries({ queryKey: ['task-table', groupId] });
    },
  });

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    if (guardAction()) return;
    moveTaskMutation.mutate({ taskId, newStatus });
  };

  const getColumnTasks = (status: TaskStatus): KanbanTask[] => {
    return (query.data || []).filter(t => t.status === status);
  };

  return {
    tasks: query.data || [],
    isLoading: query.isLoading,
    columns: KANBAN_COLUMNS,
    getColumnTasks,
    moveTask,
    isMoving: moveTaskMutation.isPending,
  };
}
