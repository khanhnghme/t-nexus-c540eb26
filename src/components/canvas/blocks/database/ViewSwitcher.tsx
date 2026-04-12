import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Table2, Kanban, Calendar, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewConfig, ViewType } from "./types";

const VIEW_ICONS: Record<ViewType, typeof Table2> = {
  table: Table2,
  board: Kanban,
  calendar: Calendar,
  list: List,
};

const VIEW_LABELS: Record<ViewType, string> = {
  table: "Table",
  board: "Board",
  calendar: "Calendar",
  list: "List",
};

interface ViewSwitcherProps {
  views: ViewConfig[];
  activeViewId: string;
  editable: boolean;
  onSwitchView: (viewId: string) => void;
  onAddView: (name: string, type: ViewType) => void;
  onDeleteView: (viewId: string) => void;
  onRenameView: (viewId: string, name: string) => void;
}

export const ViewSwitcher = memo(function ViewSwitcher({
  views,
  activeViewId,
  editable,
  onSwitchView,
  onAddView,
  onDeleteView,
  onRenameView,
}: ViewSwitcherProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  const startRename = useCallback((view: ViewConfig) => {
    setRenamingId(view.id);
    setRenameValue(view.name);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      onRenameView(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }, [renamingId, renameValue, onRenameView]);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto">
      {views.map((view) => {
        const Icon = VIEW_ICONS[view.type];
        const isActive = view.id === activeViewId;

        if (renamingId === view.id) {
          return (
            <Input
              key={view.id}
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingId(null);
              }}
              className="h-7 w-24 text-xs px-1.5"
            />
          );
        }

        return (
          <DropdownMenu key={view.id}>
            <DropdownMenuTrigger asChild disabled={!editable}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-xs gap-1 shrink-0 ${
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={(e) => {
                  // Left click switches view; context menu opens dropdown
                  e.preventDefault();
                  onSwitchView(view.id);
                }}
                onContextMenu={(e) => {
                  if (!editable) return;
                  // Let dropdown handle via right-click trigger
                }}
                onDoubleClick={(e) => {
                  if (!editable) return;
                  e.preventDefault();
                  startRename(view);
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {view.name}
              </Button>
            </DropdownMenuTrigger>
            {editable && (
              <DropdownMenuContent align="start" className="w-32">
                <DropdownMenuItem onClick={() => startRename(view)}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={views.length <= 1}
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteView(view.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        );
      })}

      {editable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {(Object.keys(VIEW_LABELS) as ViewType[]).map((type) => {
              const Icon = VIEW_ICONS[type];
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => onAddView(VIEW_LABELS[type], type)}
                  className="gap-2"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {VIEW_LABELS[type]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});
