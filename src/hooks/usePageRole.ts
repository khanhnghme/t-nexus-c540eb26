import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseRole, isAtLeast } from "@/lib/permissions";

interface UsePageRoleResult {
  pageRole: string | null;
  canEdit: boolean;
  isLoading: boolean;
}

/**
 * Resolve the effective role for a user on a specific page.
 *
 * Resolution order:
 *   1. page_members  → project_page:owner/admin/member
 *   2. group_members → project_basic:owner/admin/member  (fallback)
 *   3. get_workspace_role() → workspace:owner/admin/member (inheritance)
 *
 * canEdit = true when effective role level is owner or admin.
 */
export function usePageRole(pageId: string | null | undefined, groupId?: string): UsePageRoleResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["page-role", pageId, user?.id],
    enabled: !!pageId && !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      if (!pageId || !user?.id) return null;

      // 1. Check page_members
      const { data: pageMember } = await supabase
        .from("page_members")
        .select("role")
        .eq("page_id", pageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (pageMember?.role) return pageMember.role as string;

      // 2. Fallback to group_members (need groupId or derive from page)
      let resolvedGroupId = groupId;
      if (!resolvedGroupId) {
        const { data: page } = await supabase
          .from("project_pages")
          .select("group_id")
          .eq("id", pageId)
          .maybeSingle();
        resolvedGroupId = page?.group_id ?? undefined;
      }

      if (resolvedGroupId) {
        const { data: groupMember } = await supabase
          .from("group_members")
          .select("role")
          .eq("group_id", resolvedGroupId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (groupMember?.role) return groupMember.role as string;

        // 3. Workspace inheritance
        const { data: group } = await supabase
          .from("groups")
          .select("workspace_id")
          .eq("id", resolvedGroupId)
          .maybeSingle();

        if (group?.workspace_id) {
          const { data: wsRole } = await supabase.rpc("get_workspace_role", {
            _user_id: user.id,
            _workspace_id: group.workspace_id,
          });
          if (wsRole) return wsRole as string;
        }
      }

      return null;
    },
  });

  const pageRole = data ?? null;

  let canEdit = false;
  if (pageRole) {
    const parsed = parseRole(pageRole);
    if (parsed) {
      canEdit = parsed.role === "owner" || parsed.role === "admin";
    }
  }

  return { pageRole, canEdit, isLoading };
}
