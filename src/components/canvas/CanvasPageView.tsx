import { useProjectPages, useCreatePage } from "@/hooks/useProjectPages";
import CanvasEditor from "./CanvasEditor";
import { Loader2, FileText, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PartialBlock } from "@blocknote/core";

interface CanvasPageViewProps {
  groupId: string;
  editable?: boolean;
}

export default function CanvasPageView({ groupId, editable = false }: CanvasPageViewProps) {
  const { data: pages, isLoading, error, refetch } = useProjectPages(groupId);
  const { user } = useAuth();
  const createPage = useCreatePage();

  const handleCreateFirstPage = async () => {
    if (!user) return;
    try {
      await createPage.mutateAsync({
        group_id: groupId,
        title: "Untitled Page",
        content: [{ type: "paragraph", content: [] }],
        created_by: user.id,
        display_order: 0,
      });
      toast.success("Đã tạo trang mới!");
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo trang.");
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

  const page = pages?.[0];

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <FileText className="h-8 w-8" />
        <p className="text-sm">Chưa có trang nào được tạo.</p>
        {editable && (
          <Button
            size="sm"
            onClick={handleCreateFirstPage}
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

  const initialContent = Array.isArray(page.content)
    ? (page.content as unknown as PartialBlock[])
    : undefined;

  return (
    <div className="px-4 md:px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold">{page.title}</h2>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Canvas</Badge>
      </div>
      <div className="border rounded-lg bg-card">
        <CanvasEditor
          key={page.id}
          initialContent={initialContent}
          editable={editable}
          pageId={page.id}
        />
      </div>
    </div>
  );
}
