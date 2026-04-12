import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems, combineByGroup } from "@blocknote/core";
import type { Block, PartialBlock } from "@blocknote/core";
import { withMultiColumn, multiColumnDropCursor, getMultiColumnSlashMenuItems } from "@blocknote/xl-multi-column";
import { useCallback, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import { useAutosave } from "@/hooks/useAutosave";
import type { DriveFile } from "@/hooks/useGoogleDrivePicker";
import { useUpdatePageContent } from "@/hooks/useProjectPages";
import { Check, Cloud, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useReadOnlyGuard } from "@/components/ReadOnlyGuard";
import { useLanguage } from "@/contexts/LanguageContext";
import { TaskListBlock } from "./blocks/TaskBlock";
import { MemberListBlock } from "./blocks/MemberBlock";
import { CalendarBlock } from "./blocks/CalendarBlock";
import { r2Storage } from "@/lib/r2Storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountLimitsCheck } from "@/hooks/useAccountLimitsCheck";
import { NoteCalloutBlock } from "./blocks/NoteBlock";
import { ToggleBlock } from "./blocks/ToggleBlock";
import { TaskBlockProvider } from "./blocks/TaskBlockContext";
import PageCoverImage from "./PageCoverImage";
import PageHeader from "./PageHeader";

const schema = withMultiColumn(BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    taskList: TaskListBlock(),
    memberList: MemberListBlock(),
    calendarView: CalendarBlock(),
    noteCallout: NoteCalloutBlock(),
    toggleBlock: ToggleBlock(),
  },
}));

export interface CanvasEditorHandle {
  forceSave: () => void;
  insertDriveFiles: (files: DriveFile[]) => void;
}

interface CanvasEditorProps {
  initialContent?: PartialBlock[];
  editable?: boolean;
  onChange?: (content: Block[]) => void;
  pageId?: string;
  groupId?: string;
  title?: string;
  icon?: string | null;
  coverUrl?: string | null;
  onChangeTitle?: (title: string) => void;
  onChangeIcon?: (icon: string | null) => void;
  onChangeCover?: (coverUrl: string | null) => void;
}

const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(function CanvasEditor({
  initialContent,
  editable = true,
  onChange,
  pageId,
  groupId,
  title = "Untitled",
  icon,
  coverUrl,
  onChangeTitle,
  onChangeIcon,
  onChangeCover,
}, ref) {
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const updatePageContent = useUpdatePageContent();
  const { isReadOnly } = useReadOnlyGuard();
  const { locale } = useLanguage();
  const { maxFileSizeMb } = useAccountLimitsCheck();
  const isVi = locale === 'vi';
  const [serializedContent] = useState("");
  const [currentContent, setCurrentContent] = useState(serializedContent);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    if (isReadOnly) {
      const msg = isVi
        ? 'Tài khoản chỉ đọc. Vui lòng nâng cấp hoặc xóa bớt dữ liệu để tiếp tục.'
        : 'Read-only account. Please upgrade or delete data to continue.';
      toast.error(msg);
      throw new Error(msg);
    }
    if (!user || !groupId || !pageId) {
      throw new Error("Không thể upload: thiếu thông tin.");
    }
    // Client-side file size check based on plan limits
    if (maxFileSizeMb !== null) {
      const maxBytes = maxFileSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        const msg = isVi
          ? `File vượt giới hạn ${maxFileSizeMb}MB của gói cước hiện tại`
          : `File exceeds ${maxFileSizeMb}MB plan limit`;
        toast.error(msg);
        throw new Error(msg);
      }
    }
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const r2Path = `canvas/${groupId}/${pageId}/${timestamp}_${safeName}`;

    const { data, error } = await r2Storage.from("project-resources").upload(r2Path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      const errorMsg = (error as any).status === 413
        ? (isVi ? `File vượt giới hạn gói cước: ${error.message}` : `File exceeds plan limit: ${error.message}`)
        : error.message;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    const { data: urlData } = r2Storage.from("project-resources").getPublicUrl(r2Path);
    const publicUrl = urlData.publicUrl;

    // Track in project_resources for storage quota
    await supabase.from("project_resources").insert({
      group_id: groupId,
      uploaded_by: user.id,
      name: file.name,
      file_path: publicUrl,
      storage_name: r2Path,
      file_size: file.size,
      file_type: file.type,
      category: "canvas-attachment",
      resource_type: "file",
    });

    return publicUrl;
  }, [user, groupId, pageId]);

  const safeInitialContent = useMemo(() => {
    if (!initialContent?.length) return undefined;
    const validTypes = new Set(Object.keys(schema.blockSpecs));
    const filterBlocks = (blocks: PartialBlock[]): PartialBlock[] =>
      blocks
        .filter((b) => !b.type || validTypes.has(b.type))
        .flatMap((b) => {
          const blockType = (b as any).type as string | undefined;
          // Guard: if columnList/column has invalid children, unwrap safely
          if ((blockType === "columnList" || blockType === "column") && b.children && !Array.isArray(b.children)) {
            console.warn(`[CanvasEditor] Malformed ${blockType} block detected, unwrapping`);
            return [];
          }
          const children = b.children?.length ? filterBlocks(b.children as PartialBlock[]) : b.children;
          // If columnList has 0 valid children after filtering, skip it
          if (blockType === "columnList" && (!children || (Array.isArray(children) && children.length === 0))) {
            console.warn("[CanvasEditor] Empty columnList removed");
            return [];
          }
          return [{ ...b, children }];
        });
    const filtered = filterBlocks(initialContent);
    return filtered.length ? filtered : undefined;
  }, [initialContent]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: safeInitialContent as any,
    uploadFile,
    dropCursor: multiColumnDropCursor,
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

  const { isSaving, lastSaved, hasUnsavedChanges, saveError, forceSave } = useAutosave({
    data: currentContent,
    onSave: handleSave,
    onError: handleSaveError,
    delay: 800,
    enabled: !!pageId && editable,
  });

  useImperativeHandle(ref, () => ({
    forceSave: () => {
      if (forceSave) forceSave();
    },
    insertDriveFiles: (files: DriveFile[]) => {
      const lastBlock = editor.document[editor.document.length - 1];
      const blocks = files.map((file) => ({
        type: "paragraph" as const,
        content: [
          {
            type: "link" as const,
            href: file.url,
            content: [{ type: "text" as const, text: `📎 ${file.title}` }],
          },
        ],
      }));
      editor.insertBlocks(blocks as any, lastBlock, "after");
      // Trigger change to autosave
      const doc = editor.document as Block[];
      if (pageId) setCurrentContent(JSON.stringify(doc));
    },
  }), [forceSave, editor, pageId]);

  const handleChange = useCallback(() => {
    const doc = editor.document as Block[];
    if (onChange) {
      onChange(doc);
    }
    if (pageId) {
      setCurrentContent(JSON.stringify(doc));
    }
  }, [editor, onChange, pageId]);

  const getSlashMenuItems = useMemo(() => {
    return async (query: string) =>
      filterSuggestionItems(
        combineByGroup(
          getDefaultReactSlashMenuItems(editor),
          getMultiColumnSlashMenuItems(editor)
        ),
        query
      );
  }, [editor]);

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
      <PageCoverImage coverUrl={coverUrl} editable={editable} groupId={groupId} maxFileSizeMb={maxFileSizeMb ?? undefined} onChangeCover={onChangeCover} />
      <div className="max-w-[900px] mx-auto w-full relative">
        {/* Save status — floating top-right */}
        {saveStatus && (
          <div className={`absolute top-2 right-2 flex items-center gap-1 text-[10px] ${saveStatus.className} z-10`}>
            <saveStatus.icon
              className={`h-3 w-3 ${saveStatus.spin ? "animate-spin" : ""}`}
            />
            {saveStatus.text}
          </div>
        )}
        <PageHeader
          title={title}
          icon={icon}
          coverUrl={coverUrl}
          editable={editable}
          groupId={groupId}
          maxFileSizeMb={maxFileSizeMb ?? undefined}
          onChangeTitle={onChangeTitle}
          onChangeIcon={onChangeIcon}
          onChangeCover={onChangeCover}
        />
        <div className={`px-6 pb-8 ${!editable ? "view-mode" : ""}`}>
          <BlockNoteView
            editor={editor}
            editable={editable}
            onChange={handleChange}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            sideMenu={editable}
            formattingToolbar={editable}
            slashMenu={false}
          >
            {editable && (
              <SuggestionMenuController
                triggerCharacter="/"
                getItems={getSlashMenuItems}
              />
            )}
          </BlockNoteView>
        </div>
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
});

export default CanvasEditor;
