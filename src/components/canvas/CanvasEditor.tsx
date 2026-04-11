import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import type { Block, PartialBlock } from "@blocknote/core";
import { useCallback, useMemo, useState } from "react";
import { useAutosave } from "@/hooks/useAutosave";
import { useUpdatePageContent } from "@/hooks/useProjectPages";
import { Check, Cloud, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { TaskListBlock } from "./blocks/TaskBlock";
import { MemberListBlock } from "./blocks/MemberBlock";
import { CalendarBlock } from "./blocks/CalendarBlock";
import { TaskBlockProvider } from "./blocks/TaskBlockContext";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    taskList: TaskListBlock(),
    memberList: MemberListBlock(),
    calendarView: CalendarBlock(),
  },
});

interface CanvasEditorProps {
  initialContent?: PartialBlock[];
  editable?: boolean;
  onChange?: (content: Block[]) => void;
  pageId?: string;
  groupId?: string;
}

export default function CanvasEditor({
  initialContent,
  editable = true,
  onChange,
  pageId,
  groupId,
}: CanvasEditorProps) {
  const { resolvedTheme } = useTheme();
  const updatePageContent = useUpdatePageContent();
  const [serializedContent] = useState("");
  const [currentContent, setCurrentContent] = useState(serializedContent);

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialContent?.length ? (initialContent as any) : undefined,
  });

  const handleSave = useCallback(
    async (data: string) => {
      if (!pageId) return;
      const content = JSON.parse(data);
      await updatePageContent.mutateAsync({ pageId, content });
    },
    [pageId, updatePageContent]
  );

  const handleSaveError = useCallback((error: Error) => {
    toast.error("Lưu thất bại. Vui lòng thử lại.", {
      description: error.message,
    });
  }, []);

  const { isSaving, lastSaved, hasUnsavedChanges, saveError } = useAutosave({
    data: currentContent,
    onSave: handleSave,
    onError: handleSaveError,
    delay: 1500,
    enabled: !!pageId && editable,
  });

  const handleChange = useCallback(() => {
    const doc = editor.document as Block[];
    if (onChange) {
      onChange(doc);
    }
    if (pageId) {
      setCurrentContent(JSON.stringify(doc));
    }
  }, [editor, onChange, pageId]);

  const saveStatus = useMemo(() => {
    if (!pageId) return null;
    if (isSaving) return { icon: Loader2, text: "Đang lưu...", spin: true, className: "text-muted-foreground" };
    if (saveError) return { icon: AlertCircle, text: "Lỗi lưu", spin: false, className: "text-destructive" };
    if (hasUnsavedChanges) return { icon: Cloud, text: "Chưa lưu", spin: false, className: "text-muted-foreground" };
    if (lastSaved) return { icon: Check, text: "Đã lưu", spin: false, className: "text-muted-foreground" };
    return null;
  }, [pageId, isSaving, hasUnsavedChanges, lastSaved, saveError]);

  const editorContent = (
    <>
      {saveStatus && (
        <div className={`flex items-center gap-1.5 px-4 py-1.5 text-xs border-b ${saveStatus.className}`}>
          <saveStatus.icon
            className={`h-3.5 w-3.5 ${saveStatus.spin ? "animate-spin" : ""}`}
          />
          {saveStatus.text}
        </div>
      )}
      <div className="p-2">
        <BlockNoteView
          editor={editor}
          editable={editable}
          onChange={handleChange}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
        />
      </div>
    </>
  );

  return (
    <div className="min-h-[460px]">
      {groupId ? (
        <TaskBlockProvider groupId={groupId} editable={editable}>
          {editorContent}
        </TaskBlockProvider>
      ) : (
        editorContent
      )}
    </div>
  );
}
