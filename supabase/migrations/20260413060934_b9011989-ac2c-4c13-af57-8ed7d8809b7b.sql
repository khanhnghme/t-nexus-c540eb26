
-- ═══════════════════════════════════════════════════════
-- STEP 3: AUTO-RBAC Migration — resource:role format
-- ═══════════════════════════════════════════════════════

-- ── Phase 1: Drop dependent RLS policies ──
DROP POLICY IF EXISTS "Users can join groups by code" ON public.group_members;
DROP POLICY IF EXISTS "Group leaders can manage pages" ON public.project_pages;

-- ── Phase 2: Drop dependent functions ──
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.has_system_role(uuid, system_role);
DROP FUNCTION IF EXISTS public.check_project_access(uuid, uuid);

-- ── Phase 3: Convert columns to text ──
-- user_roles
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;

-- group_members
ALTER TABLE public.group_members ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.group_members ALTER COLUMN role SET DEFAULT 'project_basic:member';

-- project_invitations
ALTER TABLE public.project_invitations ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.project_invitations ALTER COLUMN role SET DEFAULT 'project_basic:member';

-- ── Phase 4: Migrate data ──
-- user_roles
UPDATE public.user_roles SET role = 'system:owner' WHERE role = 'system_owner';
UPDATE public.user_roles SET role = 'system:admin' WHERE role = 'system_admin';

-- group_members
UPDATE public.group_members SET role = 'project_basic:owner' WHERE role = 'project_owner';
UPDATE public.group_members SET role = 'project_basic:admin' WHERE role = 'project_admin';
UPDATE public.group_members SET role = 'project_basic:member' WHERE role IN ('project_member', 'project_guest');

-- project_invitations
UPDATE public.project_invitations SET role = 'project_basic:owner' WHERE role = 'project_owner';
UPDATE public.project_invitations SET role = 'project_basic:admin' WHERE role = 'project_admin';
UPDATE public.project_invitations SET role = 'project_basic:member' WHERE role IN ('project_member', 'project_guest');

-- workspace_members
UPDATE public.workspace_members SET role = 'workspace:owner' WHERE role = 'workspace_owner';
UPDATE public.workspace_members SET role = 'workspace:admin' WHERE role IN ('workspace_admin', 'admin');
UPDATE public.workspace_members SET role = 'workspace:member' WHERE role IN ('workspace_member', 'member');

-- workspace_invites
UPDATE public.workspace_invites SET role_granted = 'workspace:admin' WHERE role_granted IN ('admin', 'workspace_admin');
UPDATE public.workspace_invites SET role_granted = 'workspace:member' WHERE role_granted IN ('member', 'workspace_member');

-- ── Phase 5: Drop enums ──
DROP TYPE IF EXISTS public.app_role;
DROP TYPE IF EXISTS public.system_role;
DROP TYPE IF EXISTS public.project_role;
DROP TYPE IF EXISTS public.workspace_role;

-- ── Phase 6: Add CHECK constraints ──
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('system:owner', 'system:admin'));

ALTER TABLE public.group_members ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('project_basic:owner', 'project_basic:admin', 'project_basic:member'));

ALTER TABLE public.project_invitations ADD CONSTRAINT project_invitations_role_check
  CHECK (role IN ('project_basic:owner', 'project_basic:admin', 'project_basic:member'));

-- ── Phase 7: Recreate functions (text-based) ──
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_system_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.check_project_access(_user_id uuid, _group_id uuid)
RETURNS TABLE(workspace_id uuid, ws_owner_id uuid, ws_role text, group_id uuid, visibility project_visibility, group_role text, is_project_guest boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.owner_id, public.get_workspace_role(_user_id, w.id),
         g.id, g.visibility, gm.role, gm.is_guest
  FROM public.groups g
  JOIN public.workspaces w ON w.id = g.workspace_id
  LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = _user_id
  WHERE g.id = _group_id
$$;

-- ── Phase 8: Recreate dropped RLS policies ──
CREATE POLICY "Users can join groups by code" ON public.group_members
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  AND (role = 'project_basic:member')
  AND (EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_members.group_id
      AND g.allow_join_by_code = true
      AND g.join_code IS NOT NULL
  ))
);

CREATE POLICY "Group leaders can manage pages" ON public.project_pages
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = project_pages.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('project_basic:owner', 'project_basic:admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = project_pages.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('project_basic:owner', 'project_basic:admin')
  )
);

-- ── Phase 9: Create page_members table ──
CREATE TABLE public.page_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.project_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'project_page:member'
    CHECK (role IN ('project_page:owner', 'project_page:admin', 'project_page:member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, user_id)
);

ALTER TABLE public.page_members ENABLE ROW LEVEL SECURITY;

-- Page members can view their own membership
CREATE POLICY "page_members_select" ON public.page_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_pages pp
    JOIN public.group_members gm ON gm.group_id = pp.group_id AND gm.user_id = auth.uid()
    WHERE pp.id = page_members.page_id
      AND gm.role IN ('project_basic:owner', 'project_basic:admin')
  )
  OR is_system_admin(auth.uid())
);

-- Project leaders and page owners can manage page members
CREATE POLICY "page_members_insert" ON public.page_members
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_pages pp
    JOIN public.group_members gm ON gm.group_id = pp.group_id AND gm.user_id = auth.uid()
    WHERE pp.id = page_members.page_id
      AND gm.role IN ('project_basic:owner', 'project_basic:admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.page_members pm
    WHERE pm.page_id = page_members.page_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('project_page:owner', 'project_page:admin')
  )
);

CREATE POLICY "page_members_update" ON public.page_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_pages pp
    JOIN public.group_members gm ON gm.group_id = pp.group_id AND gm.user_id = auth.uid()
    WHERE pp.id = page_members.page_id
      AND gm.role IN ('project_basic:owner', 'project_basic:admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.page_members pm
    WHERE pm.page_id = page_members.page_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('project_page:owner', 'project_page:admin')
  )
);

CREATE POLICY "page_members_delete" ON public.page_members
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_pages pp
    JOIN public.group_members gm ON gm.group_id = pp.group_id AND gm.user_id = auth.uid()
    WHERE pp.id = page_members.page_id
      AND gm.role IN ('project_basic:owner', 'project_basic:admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.page_members pm
    WHERE pm.page_id = page_members.page_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'project_page:owner'
  )
);
