import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useReadOnlyGuard } from '@/components/ReadOnlyGuard';

export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string | null;
  created_at: string;
  uploader_name?: string;
  uploader_avatar?: string | null;
}

export function useTaskAttachments(taskId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { guardAction } = useReadOnlyGuard();

  const query = useQuery({
    queryKey: ['task-attachments', taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskAttachment[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_attachments')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        task_id: row.task_id,
        user_id: row.user_id,
        file_name: row.file_name,
        file_path: row.file_path,
        file_size: row.file_size,
        content_type: row.content_type,
        created_at: row.created_at,
        uploader_name: row.profiles?.full_name || '',
        uploader_avatar: row.profiles?.avatar_url || null,
      }));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id || !taskId) throw new Error('Missing user or task');

      const filePath = `${user.id}/${taskId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type || null,
        });

      if (insertError) throw insertError;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ attachmentId, filePath }: { attachmentId: string; filePath: string }) => {
      const { error: deleteError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) throw deleteError;

      await supabase.storage.from('task-attachments').remove([filePath]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
    },
  });

  const uploadAttachment = (file: File) => {
    if (guardAction()) return;
    uploadMutation.mutate(file);
  };

  const deleteAttachment = (attachmentId: string, filePath: string) => {
    if (guardAction()) return;
    deleteMutation.mutate({ attachmentId, filePath });
  };

  const getDownloadUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(filePath, 3600);
    if (error) return null;
    return data.signedUrl;
  };

  return {
    attachments: query.data || [],
    isLoading: query.isLoading,
    uploadAttachment,
    deleteAttachment,
    getDownloadUrl,
    getSignedUrl,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
