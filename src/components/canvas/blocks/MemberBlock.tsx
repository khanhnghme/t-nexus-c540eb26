import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTaskBlockContext } from "./TaskBlockContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, List, LayoutGrid, UserPlus } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { getProjectRoleLabel } from "@/lib/roleLabels";
import { Toggle } from "@/components/ui/toggle";
import ProjectGuestInviteDialog from "@/components/ProjectGuestInviteDialog";
import { Button } from "@/components/ui/button";

interface MemberRow {
  user_id: string;
  role: string;
  full_name: string;
  avatar_url: string | null;
}

function MemberListRenderer() {
  const { groupId, editable } = useTaskBlockContext();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [groupName, setGroupName] = useState("");

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

  useEffect(() => {
    if (!groupId) return;
    supabase.from("groups").select("name").eq("id", groupId).single().then(({ data }) => {
      if (data) setGroupName(data.name);
    });
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`members-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchMembers]);

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
        <div className="ml-auto flex items-center gap-1">
          {editable && (
            <ProjectGuestInviteDialog
              groupId={groupId}
              groupName={groupName}
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              }
            />
          )}
          <Toggle
            size="sm"
            pressed={viewMode === "list"}
            onPressedChange={() => setViewMode("list")}
            aria-label="List view"
            className="h-7 w-7 p-0"
          >
            <List className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={viewMode === "grid"}
            onPressedChange={() => setViewMode("grid")}
            aria-label="Grid view"
            className="h-7 w-7 p-0"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Toggle>
          <Badge variant="secondary" className="text-xs ml-1">
            {members.length}
          </Badge>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Chưa có thành viên nào
        </p>
      ) : viewMode === "list" ? (
        <div className="space-y-1.5">
          {members.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <UserAvatar src={m.avatar_url} name={m.full_name} size="sm" />
              <span className="text-sm truncate flex-1">{m.full_name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {getProjectRoleLabel(m.role)}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {members.map((m) => (
            <div
              key={m.user_id}
              className="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
            >
              <UserAvatar src={m.avatar_url} name={m.full_name} size="md" />
              <span className="text-xs font-medium text-center truncate w-full">
                {m.full_name}
              </span>
              <Badge variant="outline" className="text-[10px]">
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