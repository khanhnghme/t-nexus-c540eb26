import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import type { Block, PartialBlock } from "@blocknote/core";
import { useCallback } from "react";

interface CanvasEditorProps {
  initialContent?: PartialBlock[];
  editable?: boolean;
  onChange?: (content: Block[]) => void;
}

export default function CanvasEditor({
  initialContent,
  editable = true,
  onChange,
}: CanvasEditorProps) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    initialContent: initialContent?.length ? initialContent : undefined,
  });

  const handleChange = useCallback(() => {
    if (onChange) {
      onChange(editor.document as Block[]);
    }
  }, [editor, onChange]);

  return (
    <div className="min-h-[460px] p-2">
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}
