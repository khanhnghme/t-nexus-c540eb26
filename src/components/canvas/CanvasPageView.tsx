import { useProjectPages } from "@/hooks/useProjectPages";
import CanvasEditor from "./CanvasEditor";
import { Loader2, FileText } from "lucide-react";
import type { PartialBlock } from "@blocknote/core";

interface CanvasPageViewProps {
  groupId: string;
  editable?: boolean;
}

export default function CanvasPageView({ groupId, editable = false }: CanvasPageViewProps) {
  const { data: pages, isLoading, error } = useProjectPages(groupId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">Không thể tải nội dung trang.</p>
      </div>
    );
  }

  const page = pages?.[0];

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <FileText className="h-8 w-8" />
        <p className="text-sm">Chưa có trang nào được tạo.</p>
      </div>
    );
  }

  const initialContent = Array.isArray(page.content)
    ? (page.content as unknown as PartialBlock[])
    : undefined;

  return (
    <div className="px-4 md:px-6 py-4">
      <h2 className="text-lg font-semibold mb-3">{page.title}</h2>
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
