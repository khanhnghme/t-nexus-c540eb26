import { useState, useEffect } from "react";
import { useProjectPages, useCreatePage, useDeletePage, useUpdatePage } from "@/hooks/useProjectPages";
import CanvasEditor from "./CanvasEditor";
import CanvasSidebar from "./CanvasSidebar";
import { Loader2, FileText, RefreshCw, Plus, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PartialBlock } from "@blocknote/core";
import { useIsMobile } from "@/hooks/use-mobile";

interface CanvasPageViewProps {
  groupId: string;
  editable?: boolean;
}

export default function CanvasPageView({ groupId, editable = false }: CanvasPageViewProps) {
  const { data: pages, isLoading, error, refetch } = useProjectPages(groupId);
  const { user } = useAuth();
  const createPage = useCreatePage();
  const deletePage = useDeletePage();
  const updatePage = useUpdatePage();
  const isMobile = useIsMobile();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Default sidebar closed on mobile
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Auto-select first page or keep selection valid
  useEffect(() => {
    if (!pages?.length) {
      setActivePageId(null);
      return;
    }
    const ids = pages.map((p) => p.id);
    if (!activePageId || !ids.includes(activePageId)) {
      setActivePageId(ids[0]);
    }
  }, [pages, activePageId]);

  const handleCreatePage = async () => {
    if (!user) return;
    try {
      const maxOrder = pages?.length
        ? Math.max(...pages.map((p) => p.display_order)) + 1
        : 0;
      const newPage = await createPage.mutateAsync({
        group_id: groupId,
        title: `Trang ${(pages?.length ?? 0) + 1}`,
        content: [{ type: "paragraph", content: [] }],
        created_by: user.id,
        display_order: maxOrder,
      });
      setActivePageId(newPage.id);
      toast.success("Đã tạo trang mới!");
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo trang.");
    }
  };

  const handleDeletePage = async (pageId: string) => {
    try {
      await deletePage.mutateAsync(pageId);
      toast.success("Đã xóa trang.");
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa trang.");
    }
  };

  const handleRenamePage = async (pageId: string, newTitle: string) => {
    try {
      await updatePage.mutateAsync({ pageId, updates: { title: newTitle } });
      toast.success("Đã đổi tên trang.");
    } catch (err: any) {
      toast.error(err.message || "Không thể đổi tên trang.");
    }
  };

  const handleChangePageIcon = async (pageId: string, icon: string | null) => {
    try {
      await updatePage.mutateAsync({ pageId, updates: { icon } });
    } catch (err: any) {
      toast.error(err.message || "Không thể thay đổi icon.");
    }
  };

  const handleReorderPages = async (orderedIds: string[]) => {
    if (!pages) return;
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          updatePage.mutateAsync({ pageId: id, updates: { display_order: index } })
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Không thể sắp xếp lại trang.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <p className="text-sm">Không thể tải nội dung trang.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Thử lại
        </Button>
      </div>
    );
  }

  if (!pages?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <FileText className="h-8 w-8" />
        <p className="text-sm">Chưa có trang nào được tạo.</p>
        {editable && (
          <Button
            size="sm"
            onClick={handleCreatePage}
            disabled={createPage.isPending}
          >
            {createPage.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            Tạo trang đầu tiên
          </Button>
        )}
      </div>
    );
  }

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];

  const initialContent = Array.isArray(activePage.content)
    ? (activePage.content as unknown as PartialBlock[])
    : undefined;

  return (
    <div className="flex border rounded-lg bg-card overflow-hidden" style={{ minHeight: 400 }}>
      {sidebarOpen && (
        <CanvasSidebar
          pages={pages.map((p) => ({ id: p.id, title: p.title, display_order: p.display_order, icon: p.icon }))}
          activePageId={activePage.id}
          onSelectPage={(id) => {
            setActivePageId(id);
            if (isMobile) setSidebarOpen(false);
          }}
          onCreatePage={handleCreatePage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
          onReorderPages={handleReorderPages}
          onChangePageIcon={handleChangePageIcon}
          onCollapse={() => setSidebarOpen(false)}
          editable={editable}
          isCreating={createPage.isPending}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b text-sm">
          {!sidebarOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setSidebarOpen(true)}
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Hiện sidebar</TooltipContent>
            </Tooltip>
          )}
          {activePage.icon && (
            <span className="text-sm leading-none">{activePage.icon}</span>
          )}
          <span className="text-muted-foreground truncate">{activePage.title}</span>
        </div>
        <CanvasEditor
          key={activePage.id}
          initialContent={initialContent}
          editable={editable}
          pageId={activePage.id}
        />
      </div>
    </div>
  );
}
