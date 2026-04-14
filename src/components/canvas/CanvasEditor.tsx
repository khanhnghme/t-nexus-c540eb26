import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems, combineByGroup } from "@blocknote/core";
import { en as bnEnLocale } from "@blocknote/core/locales";
import type { Block, PartialBlock } from "@blocknote/core";
import { withMultiColumn, multiColumnDropCursor, getMultiColumnSlashMenuItems, locales as multiColumnLocales } from "@blocknote/xl-multi-column";
import { useCallback, useImperativeHandle, useMemo, useState, useRef, forwardRef } from "react";
import { useColumnControls } from "./useColumnControls";
import { useAutosave } from "@/hooks/useAutosave";
import type { DriveFile } from "@/hooks/useGoogleDrivePicker";
import { useUpdatePageContent } from "@/hooks/useProjectPages";
import { Check, Cloud, Loader2, AlertCircle, Database } from "lucide-react";
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
import { DatabaseViewBlock } from "./blocks/database/DatabaseBlock";
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
    databaseView: DatabaseViewBlock(),
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
  const editorContainerRef = useRef<HTMLDivElement>(null);



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
    const filterBlocks = (blocks: PartialBlock[], parentType?: string): PartialBlock[] =>
      blocks
        .filter((b) => !b.type || validTypes.has(b.type))
        .flatMap((b) => {
          const blockType = (b as any).type as string | undefined;

          // Guard: ensure children is always an array
          if (b.children !== undefined && b.children !== null && !Array.isArray(b.children)) {
            console.warn(`[CanvasEditor] Malformed ${blockType} block: children is not array, unwrapping`);
            return [];
          }

          const safeChildren = Array.isArray(b.children) ? b.children : [];
          const children = safeChildren.length ? filterBlocks(safeChildren as PartialBlock[], blockType) : [];

          // Orphan column not inside columnList → unwrap its children
          if (blockType === "column" && parentType !== "columnList") {
            console.warn("[CanvasEditor] Orphan column block unwrapped");
            return children;
          }

          // columnList with 0 valid columns → skip
          if (blockType === "columnList" && children.length === 0) {
            console.warn("[CanvasEditor] Empty columnList removed");
            return [];
          }

          // columnList with only 1 column → unwrap that column's children
          if (blockType === "columnList" && children.length === 1) {
            const singleCol = children[0];
            const innerChildren = Array.isArray(singleCol.children) ? singleCol.children : [];
            console.warn("[CanvasEditor] Single-column columnList unwrapped");
            return innerChildren;
          }

          return [{ ...b, children: children.length ? children : b.children }];
        });
    const filtered = filterBlocks(initialContent);
    return filtered.length ? filtered : undefined;
  }, [initialContent]);

  const mcLocale = isVi ? (multiColumnLocales.vi ?? multiColumnLocales.en) : multiColumnLocales.en;

  const editor = useCreateBlockNote({
    schema,
    initialContent: safeInitialContent as any,
    uploadFile,
    dropCursor: multiColumnDropCursor,
    dictionary: { ...bnEnLocale, multi_column: mcLocale } as any,
  });

  const handleAddColumn = useCallback((columnListEl: HTMLElement) => {
    const blockOuter = columnListEl.closest("[data-node-type='blockOuter']") as HTMLElement | null;
    if (!blockOuter) return;
    const blockId = blockOuter.getAttribute("data-id");
    if (!blockId) return;

    try {
      const block = editor.getBlock(blockId);
      if (!block || block.type !== "columnList") return;
      const colCount = block.children?.length ?? 0;
      if (colCount >= 4) return;

      const lastChild = block.children?.[colCount - 1];
      if (!lastChild) return;

      editor.insertBlocks(
        [{ type: "column" as any, children: [{ type: "paragraph" as any }] }],
        lastChild,
        "after"
      );

      const doc = editor.document as any[];
      if (pageId) setCurrentContent(JSON.stringify(doc));
    } catch (e) {
      console.warn("[CanvasEditor] Failed to add column:", e);
    }
  }, [editor, pageId]);

  const handleRemoveColumn = useCallback((columnListEl: HTMLElement, columnIndex: number) => {
    const blockOuter = columnListEl.closest("[data-node-type='blockOuter']") as HTMLElement | null;
    if (!blockOuter) return;
    const blockId = blockOuter.getAttribute("data-id");
    if (!blockId) return;

    try {
      const block = editor.getBlock(blockId);
      if (!block || block.type !== "columnList") return;
      const columns = block.children ?? [];
      if (columns.length <= 2 || columnIndex >= columns.length) return;

      const colToRemove = columns[columnIndex];
      if (!colToRemove) return;

      editor.removeBlocks([colToRemove]);

      // If only 1 column remains after removal, unwrap it
      const updatedBlock = editor.getBlock(blockId);
      if (updatedBlock && updatedBlock.children?.length === 1) {
        const singleCol = updatedBlock.children[0];
        const innerBlocks = singleCol.children ?? [];
        if (innerBlocks.length > 0) {
          editor.insertBlocks(innerBlocks as any, updatedBlock, "after");
        }
        editor.removeBlocks([updatedBlock]);
      }

      const doc = editor.document as any[];
      if (pageId) setCurrentContent(JSON.stringify(doc));
    } catch (e) {
      console.warn("[CanvasEditor] Failed to remove column:", e);
    }
  }, [editor, pageId]);

  useColumnControls(editorContainerRef, editable && !isReadOnly, handleAddColumn, handleRemoveColumn);


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
    return async (query: string) => {
      const defaultItems = getDefaultReactSlashMenuItems(editor);
      let mcItems: ReturnType<typeof getMultiColumnSlashMenuItems> = [];
      try {
        mcItems = getMultiColumnSlashMenuItems(editor);
      } catch (e) {
        console.warn("[CanvasEditor] Multi-column slash menu items failed to load:", e);
      }
      const customItems = [
        {
          title: "Database",
          subtext: "Inline database with table, board, calendar views",
          group: "Advanced",
          icon: <Database className="h-4 w-4" />,
          onItemClick: () => {
            const currentBlock = editor.getTextCursorPosition().block;
            editor.insertBlocks(
              [{ type: "databaseView" as any }],
              currentBlock,
              "after"
            );
          },
        },
      ];
      return filterSuggestionItems(
        combineByGroup(defaultItems, mcItems, customItems as any),
        query
      );
    };
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
        <div ref={editorContainerRef} className={`px-6 pb-8 ${!editable ? "view-mode" : ""}`}>
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
