import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTaskBlockContext } from "./TaskBlockContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { getProjectRoleLabel } from "@/lib/roleLabels";

interface MemberRow {
  user_id: string;
  role: string;
  full_name: string;
  avatar_url: string | null;
}

function MemberListRenderer() {
  const { groupId } = useTaskBlockContext();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from("group_members")
      .select("user_id, role, profiles(full_name, avatar_url)")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    if (data) {
      setMembers(
        data.map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          full_name: m.profiles?.full_name || "Unknown",
          avatar_url: m.profiles?.avatar_url || null,
        }))
      );
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3" contentEditable={false}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Thành viên dự án</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {members.length}
        </Badge>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Chưa có thành viên nào
        </p>
      ) : (
        <div className="space-y-1.5">
          {members.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <UserAvatar
                src={m.avatar_url}
                name={m.full_name}
                size="sm"
              />
              <span className="text-sm truncate flex-1">{m.full_name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {getProjectRoleLabel(m.role)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const MemberListBlock = createReactBlockSpec(
  {
    type: "memberList" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      return (
        <div className="my-2" contentEditable={false}>
          <MemberListRenderer />
        </div>
      );
    },
  }
);
