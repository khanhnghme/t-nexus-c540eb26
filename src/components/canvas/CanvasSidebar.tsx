import { FileText, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface PageItem {
  id: string;
  title: string;
  display_order: number;
}

interface CanvasSidebarProps {
  pages: PageItem[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onDeletePage: (pageId: string) => void;
  editable: boolean;
  isCreating?: boolean;
}

export default function CanvasSidebar({
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  editable,
  isCreating,
}: CanvasSidebarProps) {
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
        <div className="py-1">
          {pages.map((page) => (
            <div
              key={page.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors",
                activePageId === page.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              onClick={() => onSelectPage(page.id)}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{page.title}</span>

              {editable && pages.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
