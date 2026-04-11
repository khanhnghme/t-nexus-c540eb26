import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, Plus, User, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface GroupMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface InlineTaskCreatorProps {
  groupId: string;
  adding: boolean;
  onAdd: (params?: { assigneeId?: string; deadline?: string }) => Promise<void>;
  compact?: boolean;
}

export function InlineTaskCreator({ groupId, adding, onAdd, compact = false }: InlineTaskCreatorProps) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<GroupMember | null>(null);
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (membersLoaded) return;
    const { data } = await supabase
      .from("group_members")
      .select("user_id, profiles(full_name, avatar_url)")
      .eq("group_id", groupId);

    if (data) {
      setMembers(
        data.map((m: any) => ({
          user_id: m.user_id,
          full_name: m.profiles?.full_name || "Unknown",
          avatar_url: m.profiles?.avatar_url || null,
        }))
      );
    }
    setMembersLoaded(true);
  }, [groupId, membersLoaded]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || adding) return;

    await onAdd({
      assigneeId: assignee?.user_id,
      deadline: deadline?.toISOString(),
    });

    setTitle("");
    setAssignee(null);
    setDeadline(undefined);
  };

  const reset = () => {
    setTitle("");
    setAssignee(null);
    setDeadline(undefined);
  };

  return (
    <div className={cn("flex items-center gap-2", compact ? "px-1.5 py-1.5" : "px-3 py-2", "border-t bg-muted/20")}>
      <Plus className={cn("text-muted-foreground shrink-0", compact ? "h-3 w-3" : "h-4 w-4")} />
      
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
          if (e.key === "Escape") reset();
        }}
        placeholder={compact ? "Thêm..." : "Thêm công việc mới..."}
        className={cn(
          "border-none bg-transparent shadow-none focus-visible:ring-0 px-0",
          compact ? "h-6 text-xs" : "h-7 text-sm"
        )}
        disabled={adding}
      />

      {/* Selected badges */}
      {assignee && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
          <User className="h-2.5 w-2.5" />
          <span className="truncate max-w-[60px]">{assignee.full_name.split(" ").pop()}</span>
          <X className="h-2.5 w-2.5 cursor-pointer hover:text-foreground" onClick={() => setAssignee(null)} />
        </span>
      )}
      {deadline && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
          <Calendar className="h-2.5 w-2.5" />
          {format(deadline, "dd/MM")}
          <X className="h-2.5 w-2.5 cursor-pointer hover:text-foreground" onClick={() => setDeadline(undefined)} />
        </span>
      )}

      {/* Member picker */}
      <Popover open={memberOpen} onOpenChange={(open) => { setMemberOpen(open); if (open) fetchMembers(); }}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "text-muted-foreground hover:text-primary transition-colors shrink-0",
              assignee && "text-primary"
            )}
            title="Gán thành viên"
          >
            <User className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="end">
          <div className="max-h-48 overflow-y-auto">
            {members.length === 0 && (
              <p className="text-xs text-muted-foreground p-2 text-center">Không có thành viên</p>
            )}
            {members.map((m) => (
              <button
                key={m.user_id}
                onClick={() => { setAssignee(m); setMemberOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors text-left",
                  assignee?.user_id === m.user_id && "bg-primary/10 text-primary"
                )}
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-3 w-3" />
                  </div>
                )}
                <span className="truncate">{m.full_name}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Deadline picker */}
      <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "text-muted-foreground hover:text-primary transition-colors shrink-0",
              deadline && "text-primary"
            )}
            title="Đặt deadline"
          >
            <Calendar className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="single"
            selected={deadline}
            onSelect={(date) => { setDeadline(date); setDeadlineOpen(false); }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
