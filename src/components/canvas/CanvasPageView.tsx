import { useState, useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectPages, useCreatePage, useDeletePage, useUpdatePage } from "@/hooks/useProjectPages";
import CanvasEditor from "./CanvasEditor";
import type { CanvasEditorHandle } from "./CanvasEditor";
import CanvasSidebar from "./CanvasSidebar";
import { Loader2, FileText, RefreshCw, Plus, PanelLeft, Pencil, Eye, Save, Menu, Download, Link2, HelpCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PartialBlock } from "@blocknote/core";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Json } from "@/integrations/supabase/types";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { downloadMarkdown, downloadPdf } from "@/lib/canvasExport";
import type { Block } from "@blocknote/core";
import { useCanvasShortcuts } from "@/hooks/useCanvasShortcuts";
import { usePageLastEditor } from "@/hooks/usePageLastEditor";
import { logActivity } from "@/lib/activityLogger";
import ShortcutHelpDialog from "./ShortcutHelpDialog";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const SaveAsTemplateDialog = lazy(() => import("./SaveAsTemplateDialog"));

interface CanvasPageViewProps {
  groupId: string;
  editable?: boolean;
  projectSlug?: string;
  initialPageSlug?: string;
}

export default function CanvasPageView({ groupId, editable = false, projectSlug, initialPageSlug }: CanvasPageViewProps) {
  const { data: pages, isLoading, error, refetch } = useProjectPages(groupId);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const createPage = useCreatePage();
  const deletePage = useDeletePage();
  const updatePage = useUpdatePage();
  const isMobile = useIsMobile();
  const editorRef = useRef<CanvasEditorHandle>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditMode, setIsEditMode] = useState(editable);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  // Last editor indicator
  const { data: lastEditor } = usePageLastEditor(activePageId);

  // Default sidebar closed on mobile
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Resolve initialPageSlug to activePageId, or auto-select first page
  useEffect(() => {
    if (!pages?.length) {
      setActivePageId(null);
      return;
    }
    const ids = pages.map((p) => p.id);

    if (initialPageSlug) {
      const matchedPage = pages.find((p) => p.slug === initialPageSlug);
      if (matchedPage) {
        setActivePageId(matchedPage.id);
        return;
      }
    }

    if (!activePageId || !ids.includes(activePageId)) {
      const firstPage = pages[0];
      setActivePageId(firstPage.id);
      if (projectSlug && firstPage.slug && !initialPageSlug) {
        navigate(`/p/${projectSlug}/page/${firstPage.slug}`, { replace: true });
      }
    }
  }, [pages, initialPageSlug]);

  const navigateToPage = (page: { id: string; slug?: string | null }) => {
    setActivePageId(page.id);
    if (projectSlug && page.slug) {
      navigate(`/p/${projectSlug}/page/${page.slug}`);
    }
    if (isMobile) setSidebarOpen(false);
  };

  const doLog = useCallback((action: string, description: string, metadata?: Record<string, any>) => {
    if (!user || !profile) return;
    logActivity({
      userId: user.id,
      userName: profile.full_name || "Unknown",
      action,
      actionType: "project",
      description,
      groupId,
      metadata,
    });
  }, [user, profile, groupId]);

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
      if (projectSlug && newPage.slug) {
        navigate(`/p/${projectSlug}/page/${newPage.slug}`);
      }
      setActivePageId(newPage.id);
      doLog("page_created", `Tạo trang "${newPage.title}"`, { page_id: newPage.id });
      toast.success("Đã tạo trang mới!");
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo trang.");
    }
  };

  const handleDeletePage = async (pageId: string) => {
    try {
      const page = pages?.find(p => p.id === pageId);
      await deletePage.mutateAsync(pageId);
      doLog("page_deleted", `Xóa trang "${page?.title || ""}"`, { page_id: pageId });
      toast.success("Đã xóa trang.");
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa trang.");
    }
  };

  const handleRenamePage = async (pageId: string, newTitle: string) => {
    try {
      const result = await updatePage.mutateAsync({ pageId, updates: { title: newTitle } });
      if (projectSlug && result.slug && pageId === activePageId) {
        navigate(`/p/${projectSlug}/page/${result.slug}`, { replace: true });
      }
      doLog("page_renamed", `Đổi tên trang thành "${newTitle}"`, { page_id: pageId });
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

  const handleChangeCover = async (pageId: string, coverUrl: string | null) => {
    try {
      await updatePage.mutateAsync({ pageId, updates: { cover_url: coverUrl } });
    } catch (err: any) {
      toast.error(err.message || "Không thể thay đổi cover.");
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

  // Keyboard shortcuts
  useCanvasShortcuts({
    onForceSave: () => editorRef.current?.forceSave(),
    onCreatePage: editable ? handleCreatePage : undefined,
    onToggleSidebar: () => setSidebarOpen(prev => !prev),
    onToggleEditMode: editable ? () => setIsEditMode(prev => !prev) : undefined,
    onOpenHelp: () => setShortcutHelpOpen(true),
  }, true);

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
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && sidebarOpen && (
        <CanvasSidebar
          pages={pages.map((p) => ({ id: p.id, title: p.title, display_order: p.display_order, icon: p.icon, slug: p.slug }))}
          activePageId={activePage.id}
          onSelectPage={(pageId) => {
            const page = pages.find((p) => p.id === pageId);
            if (page) navigateToPage(page);
          }}
          onCreatePage={handleCreatePage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
          onReorderPages={handleReorderPages}
          onChangePageIcon={handleChangePageIcon}
          onCollapse={() => setSidebarOpen(false)}
          editable={isEditMode}
          isCreating={createPage.isPending}
        />
      )}

      {/* Mobile sidebar as Sheet */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[260px] p-0">
            <SheetTitle className="sr-only">Trang</SheetTitle>
            <CanvasSidebar
              pages={pages.map((p) => ({ id: p.id, title: p.title, display_order: p.display_order, icon: p.icon, slug: p.slug }))}
              activePageId={activePage.id}
              onSelectPage={(pageId) => {
                const page = pages.find((p) => p.id === pageId);
                if (page) navigateToPage(page);
              }}
              onCreatePage={handleCreatePage}
              onDeletePage={handleDeletePage}
              onRenamePage={handleRenamePage}
              onReorderPages={handleReorderPages}
              onChangePageIcon={handleChangePageIcon}
              editable={isEditMode}
              isCreating={createPage.isPending}
              isDrawer
            />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Slim AFFiNE-style toolbar */}
        <div className="flex items-center gap-1 px-2 py-1 border-b text-sm shrink-0">
          {(!sidebarOpen || isMobile) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setSidebarOpen(true)}
                >
                  {isMobile ? <Menu className="h-4 w-4" /> : <PanelLeft className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Hiện sidebar</TooltipContent>
            </Tooltip>
          )}

          {activePage.icon && (
            <span className="text-sm leading-none">{activePage.icon}</span>
          )}
          <span className="text-muted-foreground truncate flex-1 text-xs">{activePage.title}</span>

          {/* Last editor — subtle */}
          {lastEditor && (
            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline truncate max-w-[160px]">
              {lastEditor.editorName} · {formatDistanceToNow(new Date(lastEditor.editedAt), { addSuffix: true, locale: vi })}
            </span>
          )}

          {/* Edit/View toggle — icon only */}
          {editable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isEditMode ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setIsEditMode((prev) => !prev)}
                >
                  {isEditMode ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEditMode ? "Chế độ chỉnh sửa" : "Chế độ xem trước"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* More actions dropdown — gom Export/Template/Share/Help */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {editable && (
                <DropdownMenuItem onClick={() => setSaveTemplateOpen(true)}>
                  <Save className="h-3.5 w-3.5 mr-2" />
                  Lưu làm template
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                const content = activePage.content as unknown as any[];
                downloadPdf(content || [], activePage.title);
                toast.success("Đã export PDF!");
              }}>
                <Download className="h-3.5 w-3.5 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const content = activePage.content as unknown as any[];
                downloadMarkdown(content || [], activePage.title);
                toast.success("Đã export Markdown!");
              }}>
                <Download className="h-3.5 w-3.5 mr-2" />
                Export Markdown
              </DropdownMenuItem>
              {projectSlug && (
                <DropdownMenuItem onClick={() => {
                  const url = `${window.location.origin}/share/${projectSlug}/page/${activePage.slug || ""}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Đã copy link trang!");
                }}>
                  <Link2 className="h-3.5 w-3.5 mr-2" />
                  Copy link chia sẻ
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShortcutHelpOpen(true)}>
                <HelpCircle className="h-3.5 w-3.5 mr-2" />
                Phím tắt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Editor content */}
        <div className="flex-1">
          <CanvasEditor
            ref={editorRef}
            key={activePage.id}
            initialContent={initialContent}
            editable={isEditMode}
            pageId={activePage.id}
            groupId={groupId}
            title={activePage.title}
            icon={activePage.icon}
            coverUrl={activePage.cover_url}
            onChangeTitle={(newTitle) => handleRenamePage(activePage.id, newTitle)}
            onChangeIcon={(icon) => handleChangePageIcon(activePage.id, icon)}
            onChangeCover={(coverUrl) => handleChangeCover(activePage.id, coverUrl)}
          />
        </div>
      </div>
      {saveTemplateOpen && (
        <Suspense fallback={null}>
          <SaveAsTemplateDialog
            open={saveTemplateOpen}
            onOpenChange={setSaveTemplateOpen}
            content={activePage.content as Json}
            defaultName={activePage.title}
          />
        </Suspense>
      )}
      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </div>
  );
}