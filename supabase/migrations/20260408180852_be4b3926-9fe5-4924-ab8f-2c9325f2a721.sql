-- Add max_file_size_mb to plan_limits
ALTER TABLE public.plan_limits 
ADD COLUMN IF NOT EXISTS max_file_size_mb integer NOT NULL DEFAULT 5;

-- Update values for each plan
UPDATE public.plan_limits SET max_file_size_mb = 5 WHERE plan = 'plan_free';
UPDATE public.plan_limits SET max_file_size_mb = 100 WHERE plan = 'plan_plus';
UPDATE public.plan_limits SET max_file_size_mb = 5120 WHERE plan = 'plan_pro';
UPDATE public.plan_limits SET max_file_size_mb = 5120 WHERE plan = 'plan_business';
UPDATE public.plan_limits SET max_file_size_mb = 5120 WHERE plan = 'plan_custom';

-- Add downgraded_at to profiles for grace period tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS downgraded_at timestamp with time zone DEFAULT NULL;

-- RPC: Calculate total storage usage (in MB) for all workspaces owned by a user
CREATE OR REPLACE FUNCTION public.get_account_storage_usage(_owner_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(total_bytes), 0) / (1024.0 * 1024.0)
  FROM (
    -- project_resources
    SELECT pr.file_size AS total_bytes
    FROM public.project_resources pr
    JOIN public.groups g ON g.id = pr.group_id
    JOIN public.workspaces w ON w.id = g.workspace_id
    WHERE w.owner_id = _owner_id AND pr.file_size > 0
    
    UNION ALL
    
    -- task_note_attachments
    SELECT tna.file_size AS total_bytes
    FROM public.task_note_attachments tna
    JOIN public.task_notes tn ON tn.id = tna.note_id
    JOIN public.tasks t ON t.id = tn.task_id
    JOIN public.groups g ON g.id = t.group_id
    JOIN public.workspaces w ON w.id = g.workspace_id
    WHERE w.owner_id = _owner_id AND tna.file_size > 0
    
    UNION ALL
    
    -- appeal_attachments
    SELECT aa.file_size AS total_bytes
    FROM public.appeal_attachments aa
    JOIN public.score_appeals sa ON sa.id = aa.appeal_id
    JOIN public.task_scores ts ON ts.id = sa.task_score_id
    JOIN public.tasks t ON t.id = ts.task_id
    JOIN public.groups g ON g.id = t.group_id
    JOIN public.workspaces w ON w.id = g.workspace_id
    WHERE w.owner_id = _owner_id AND aa.file_size > 0
    
    UNION ALL
    
    -- submission_history
    SELECT sh.file_size AS total_bytes
    FROM public.submission_history sh
    JOIN public.tasks t ON t.id = sh.task_id
    JOIN public.groups g ON g.id = t.group_id
    JOIN public.workspaces w ON w.id = g.workspace_id
    WHERE w.owner_id = _owner_id AND sh.file_size IS NOT NULL AND sh.file_size > 0
  ) sub
$$;

-- RPC: Get storage usage per workspace for a specific owner
CREATE OR REPLACE FUNCTION public.get_workspace_storage_usage(_workspace_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(total_bytes), 0) / (1024.0 * 1024.0)
  FROM (
    SELECT pr.file_size AS total_bytes
    FROM public.project_resources pr
    JOIN public.groups g ON g.id = pr.group_id
    WHERE g.workspace_id = _workspace_id AND pr.file_size > 0
    
    UNION ALL
    
    SELECT tna.file_size AS total_bytes
    FROM public.task_note_attachments tna
    JOIN public.task_notes tn ON tn.id = tna.note_id
    JOIN public.tasks t ON t.id = tn.task_id
    JOIN public.groups g ON g.id = t.group_id
    WHERE g.workspace_id = _workspace_id AND tna.file_size > 0
    
    UNION ALL
    
    SELECT aa.file_size AS total_bytes
    FROM public.appeal_attachments aa
    JOIN public.score_appeals sa ON sa.id = aa.appeal_id
    JOIN public.task_scores ts ON ts.id = sa.task_score_id
    JOIN public.tasks t ON t.id = ts.task_id
    JOIN public.groups g ON g.id = t.group_id
    WHERE g.workspace_id = _workspace_id AND aa.file_size > 0
    
    UNION ALL
    
    SELECT sh.file_size AS total_bytes
    FROM public.submission_history sh
    JOIN public.tasks t ON t.id = sh.task_id
    JOIN public.groups g ON g.id = t.group_id
    WHERE g.workspace_id = _workspace_id AND sh.file_size IS NOT NULL AND sh.file_size > 0
  ) sub
$$;

-- RPC: Count unique members across all workspaces of an owner
CREATE OR REPLACE FUNCTION public.get_account_unique_members(_owner_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT member_id)::integer
  FROM (
    -- Owner themselves
    SELECT _owner_id AS member_id
    
    UNION
    
    -- All workspace members
    SELECT wm.user_id AS member_id
    FROM public.workspace_members wm
    JOIN public.workspaces w ON w.id = wm.workspace_id
    WHERE w.owner_id = _owner_id
    
    UNION
    
    -- All project guests (is_guest=true in group_members of projects in owned workspaces)
    SELECT gm.user_id AS member_id
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    JOIN public.workspaces w ON w.id = g.workspace_id
    WHERE w.owner_id = _owner_id AND gm.is_guest = true
  ) all_members
$$;