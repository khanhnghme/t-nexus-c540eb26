
-- task_attachments table
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  storage_name text NOT NULL DEFAULT 'task-attachments',
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: group members
CREATE POLICY "Group members can view task attachments"
ON public.task_attachments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks t
  JOIN group_members gm ON gm.group_id = t.group_id
  WHERE t.id = task_attachments.task_id
    AND gm.user_id = auth.uid()
));

-- INSERT: group members, own user_id
CREATE POLICY "Group members can upload task attachments"
ON public.task_attachments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN group_members gm ON gm.group_id = t.group_id
    WHERE t.id = task_attachments.task_id
      AND gm.user_id = auth.uid()
  )
);

-- DELETE: uploader or group leader
CREATE POLICY "Uploader or leader can delete task attachments"
ON public.task_attachments FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_attachments.task_id
      AND is_group_leader(auth.uid(), t.group_id)
  )
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Group members can upload task attachment files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Group members can view task attachment files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can delete own task attachment files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
