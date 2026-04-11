import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmojiPicker from "./EmojiPicker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

interface PageItem {
  id: string;
  title: string;
  display_order: number;
  icon?: string | null;
}

interface CanvasSidebarProps {
  pages: PageItem[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onDeletePage: (pageId: string) => void;
  onRenamePage?: (pageId: string, newTitle: string) => void;
  onReorderPages?: (orderedIds: string[]) => void;
  onChangePageIcon?: (pageId: string, icon: string | null) => void;
  editable: boolean;
  isCreating?: boolean;
}

function InlineRenameTitle({
  title,
  editable,
  onRename,
}: {
  title: string;
  editable: boolean;
  onRename: (newTitle: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(title);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, title]);

  const save = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      onRename(trimmed);
    }
    setEditing(false);
  }, [value, title, onRename]);

  if (!editing) {
    return (
      <span
        className="truncate flex-1"
        onDoubleClick={(e) => {
          if (editable) {
            e.stopPropagation();
            setEditing(true);
          }
        }}
      >
        {title}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      className="flex-1 min-w-0 bg-background border border-input rounded px-1 py-0 text-sm outline-none focus:ring-1 focus:ring-ring"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function CanvasSidebar({
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onRenamePage,
  onReorderPages,
  onChangePageIcon,
  editable,
  isCreating,
}: CanvasSidebarProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const reordered = Array.from(pages);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onReorderPages?.(reordered.map((p) => p.id));
  };

  return (
    <div className="w-[220px] shrink-0 border-r bg-muted/30 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Trang
        </span>
        {editable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCreatePage}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="pages-list">
            {(provided) => (
              <div
                className="py-1"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {pages.map((page, index) => (
                  <Draggable
                    key={page.id}
                    draggableId={page.id}
                    index={index}
                    isDragDisabled={!editable}
                  >
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={cn(
                          "group flex items-center gap-1 px-1 py-1.5 cursor-pointer text-sm transition-colors",
                          activePageId === page.id
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          snapshot.isDragging && "opacity-80 shadow-sm bg-accent"
                        )}
                        onClick={() => onSelectPage(page.id)}
                      >
                        {editable && (
                          <span
                            {...dragProvided.dragHandleProps}
                            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </span>
                        )}
                        {!editable && (
                          <span className="pl-2" />
                        )}

                        {editable ? (
                          <EmojiPicker
                            currentEmoji={page.icon}
                            onSelect={(emoji) => onChangePageIcon?.(page.id, emoji)}
                          >
                            <button
                              className="shrink-0 hover:bg-accent/50 rounded p-0.5 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {page.icon ? (
                                <span className="text-sm leading-none">{page.icon}</span>
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </EmojiPicker>
                        ) : (
                          page.icon ? (
                            <span className="text-sm leading-none shrink-0">{page.icon}</span>
                          ) : (
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                          )
                        )}
                        <InlineRenameTitle
                          title={page.title}
                          editable={editable}
                          onRename={(newTitle) => onRenamePage?.(page.id, newTitle)}
                        />

                        {editable && pages.length > 1 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xóa trang "{page.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Nội dung trang sẽ bị xóa vĩnh viễn và không thể khôi phục.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDeletePage(page.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Xóa
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ScrollArea>
    </div>
  );
}
