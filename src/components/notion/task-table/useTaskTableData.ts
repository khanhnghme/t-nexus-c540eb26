import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskTableRow {
  id: string;
  short_id: string | null;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';
  deadline: string | null;
  extended_deadline: string | null;
  submission_method: string;
  created_at: string;
  stage_name: string | null;
  stage_id: string | null;
  is_hidden: boolean | null;
  assignees: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  }[];
  scores: {
    user_id: string;
    final_score: number | null;
    base_score: number;
  }[];
}

export function useTaskTableData(groupId: string | undefined) {
  return useQuery({
    queryKey: ['task-table', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<TaskTableRow[]> => {
      if (!groupId) return [];

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, short_id, title, status, deadline, extended_deadline, submission_method, created_at, stage_id, is_hidden')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      if (!tasks?.length) return [];

      const taskIds = tasks.map(t => t.id);

      // Fetch assignments with profiles, stages, scores in parallel
      const [assignmentsRes, stagesRes, scoresRes] = await Promise.all([
        supabase
          .from('task_assignments')
          .select('task_id, user_id, profiles:user_id(full_name, avatar_url)')
          .in('task_id', taskIds),
        supabase
          .from('stages')
          .select('id, name')
          .eq('group_id', groupId),
        supabase
          .from('task_scores')
          .select('task_id, user_id, final_score, base_score')
          .in('task_id', taskIds),
      ]);

      const stageMap = new Map(
        (stagesRes.data || []).map(s => [s.id, s.name])
      );

      // Group assignments by task_id
      const assignmentsByTask = new Map<string, TaskTableRow['assignees']>();
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

      // Group scores by task_id
      const scoresByTask = new Map<string, TaskTableRow['scores']>();
      for (const s of scoresRes.data || []) {
        const list = scoresByTask.get(s.task_id) || [];
        list.push({
          user_id: s.user_id,
          final_score: s.final_score,
          base_score: s.base_score,
        });
        scoresByTask.set(s.task_id, list);
      }

      return tasks.map(task => ({
        id: task.id,
        short_id: task.short_id,
        title: task.title,
        status: task.status as TaskTableRow['status'],
        deadline: task.deadline,
        extended_deadline: task.extended_deadline,
        submission_method: task.submission_method,
        created_at: task.created_at,
        stage_id: task.stage_id,
        stage_name: task.stage_id ? stageMap.get(task.stage_id) || null : null,
        is_hidden: task.is_hidden,
        assignees: assignmentsByTask.get(task.id) || [],
        scores: scoresByTask.get(task.id) || [],
      }));
    },
  });
}
