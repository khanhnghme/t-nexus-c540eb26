import { useEffect, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useAutosave } from '@/hooks/useAutosave';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotionEditorProps {
  pageId: string;
  initialContent: Block[];
  editable?: boolean;
  onContentChange?: (content: Block[]) => void;
}

export default function NotionEditor({ pageId, initialContent, editable = true, onContentChange }: NotionEditorProps) {
  const { translations: { app: t } } = useLanguage();
  const nt = (t as any).notionEditor || {};

  const editor = useCreateBlockNote({
    initialContent: initialContent.length > 0 ? initialContent : undefined,
  }, [pageId]);

  const { isSaving, lastSaved, hasUnsavedChanges, resetSavedData } = useAutosave({
    data: JSON.stringify(editor.document),
    onSave: async (data: string) => {
      await supabase
        .from('project_pages')
        .update({ content: JSON.parse(data), updated_at: new Date().toISOString() })
        .eq('id', pageId);
    },
    delay: 1500,
    enabled: editable,
  });

  // Reset saved data when switching pages
  useEffect(() => {
    resetSavedData(JSON.stringify(editor.document));
  }, [pageId]);

  return (
    <div className="flex flex-col h-full">
      {/* Save status */}
      <div className="flex items-center justify-end px-4 py-1.5 text-xs text-muted-foreground border-b">
        {isSaving ? (
          <span className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {nt.saving || 'Saving...'}
          </span>
        ) : lastSaved ? (
          <span className="flex items-center gap-1 text-success">
            <Check className="w-3 h-3" />
            {nt.saved || 'Saved'}
          </span>
        ) : hasUnsavedChanges ? (
          <span>{nt.unsaved || 'Unsaved'}</span>
        ) : null}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <BlockNoteView
          editor={editor}
          editable={editable}
          theme="light"
          onChange={() => {
            onContentChange?.(editor.document as Block[]);
          }}
        />
      </div>
    </div>
  );
}
