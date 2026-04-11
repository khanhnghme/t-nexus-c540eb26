import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import type { Block, PartialBlock } from "@blocknote/core";
import { useCallback, useMemo, useState } from "react";
import { useAutosave } from "@/hooks/useAutosave";
import { useUpdatePageContent } from "@/hooks/useProjectPages";
import { Check, Cloud, Loader2 } from "lucide-react";

interface CanvasEditorProps {
  initialContent?: PartialBlock[];
  editable?: boolean;
  onChange?: (content: Block[]) => void;
  pageId?: string; // When set, enables auto-save to DB
}

export default function CanvasEditor({
  initialContent,
  editable = true,
  onChange,
  pageId,
}: CanvasEditorProps) {
  const { resolvedTheme } = useTheme();
  const updatePageContent = useUpdatePageContent();
  const [serializedContent, setSerializedContent] = useState("");

  const editor = useCreateBlockNote({
    initialContent: initialContent?.length ? initialContent : undefined,
  });

  const handleSave = useCallback(
    async (data: string) => {
      if (!pageId) return;
      const content = JSON.parse(data);
      await updatePageContent.mutateAsync({ pageId, content });
    },
    [pageId, updatePageContent]
  );

  const { isSaving, lastSaved, hasUnsavedChanges } = useAutosave({
    data: serializedContent,
    onSave: handleSave,
    delay: 1500,
    enabled: !!pageId && editable,
  });

  const handleChange = useCallback(() => {
    const doc = editor.document as Block[];
    if (onChange) {
      onChange(doc);
    }
    if (pageId) {
      setSerializedContent(JSON.stringify(doc));
    }
  }, [editor, onChange, pageId]);

  const saveStatus = useMemo(() => {
    if (!pageId) return null;
    if (isSaving) return { icon: Loader2, text: "Saving...", spin: true };
    if (hasUnsavedChanges) return { icon: Cloud, text: "Unsaved", spin: false };
    if (lastSaved) return { icon: Check, text: "Saved", spin: false };
    return null;
  }, [pageId, isSaving, hasUnsavedChanges, lastSaved]);

  return (
    <div className="min-h-[460px]">
      {saveStatus && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground border-b">
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
    </div>
  );
}
