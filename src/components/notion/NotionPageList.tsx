import { useState, useRef, useCallback } from 'react';
import { Plus, FileText, Loader2, MoreHorizontal, Pencil, Trash2, Smile, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface PageItem {
  id: string;
  title: string;
  display_order: number;
  icon?: string | null;
}

interface NotionPageListProps {
  pages: PageItem[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => Promise<void>;
  onRenamePage?: (pageId: string, newTitle: string) => Promise<void>;
  onDeletePage?: (pageId: string) => Promise<void>;
  onReorderPages?: (reorderedPages: PageItem[]) => Promise<void>;
  onUpdateIcon?: (pageId: string, icon: string) => Promise<void>;
  isCreating?: boolean;
  isLeader?: boolean;
}

const EMOJI_LIST = [
  '📄', '📝', '📋', '📌', '📎', '📁', '📂', '🗂️',
  '💡', '🎯', '🚀', '⭐', '🔥', '💎', '🏆', '🎨',
  '📊', '📈', '📉', '🗓️', '⏰', '🔔', '💬', '📢',
  '✅', '❌', '⚠️', '❓', '🔍', '🔗', '🔒', '🔑',
  '🏠', '🌍', '🌟', '💻', '📱', '🖥️', '⚡', '🛠️',
  '📚', '🎓', '🧪', '🔬', '📐', '✏️', '🖊️', '📏',
];

export default function NotionPageList({ pages, selectedPageId, onSelectPage, onCreatePage, onRenamePage, onDeletePage, onReorderPages, onUpdateIcon, isCreating, isLeader }: NotionPageListProps) {
  const { translations: { app: t } } = useLanguage();
  const nt = (t as any).notionEditor || {};

  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingPage, setDeletingPage] = useState<PageItem | null>(null);
  const [emojiPageId, setEmojiPageId] = useState<string | null>(null);

  // Drag state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);

  const handleStartRename = useCallback((page: PageItem) => {
    setRenamingPageId(page.id);
    setRenameValue(page.title);
  }, []);

  const handleSaveRename = useCallback(async (pageId: string) => {
    if (onRenamePage && renameValue.trim()) {
      await onRenamePage(pageId, renameValue.trim());
    }
    setRenamingPageId(null);
  }, [onRenamePage, renameValue]);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingPage && onDeletePage) {
      await onDeletePage(deletingPage.id);
    }
    setDeletingPage(null);
  }, [deletingPage, onDeletePage]);

  const handleSelectEmoji = useCallback(async (pageId: string, emoji: string) => {
    if (onUpdateIcon) {
      await onUpdateIcon(pageId, emoji);
    }
    setEmojiPageId(null);
  }, [onUpdateIcon]);

  // Drag handlers
  const handleDragStart = useCallback((pageId: string) => {
    dragItemRef.current = pageId;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    setDragOverId(pageId);
  }, []);

  const handleDrop = useCallback((targetPageId: string) => {
    const sourceId = dragItemRef.current;
    if (!sourceId || sourceId === targetPageId || !onReorderPages) {
      setDragOverId(null);
      dragItemRef.current = null;
      return;
    }
    const reordered = [...pages];
    const srcIdx = reordered.findIndex(p => p.id === sourceId);
    const tgtIdx = reordered.findIndex(p => p.id === targetPageId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, moved);
    onReorderPages(reordered);
    setDragOverId(null);
    dragItemRef.current = null;
  }, [pages, onReorderPages]);

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    dragItemRef.current = null;
  }, []);

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {nt.pages || 'Pages'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCreatePage}
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {pages.map(page => (
            <div
              key={page.id}
              draggable={isLeader}
              onDragStart={() => handleDragStart(page.id)}
              onDragOver={(e) => handleDragOver(e, page.id)}
              onDrop={() => handleDrop(page.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group flex items-center rounded-md transition-colors',
                dragOverId === page.id && 'border-t-2 border-primary',
              )}
            >
              {isLeader && (
                <GripVertical className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-40 cursor-grab ml-0.5" />
              )}
              <button
                onClick={() => onSelectPage(page.id)}
                className={cn(
                  'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors min-w-0',
                  selectedPageId === page.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                {renamingPageId === page.id ? (
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(page.id);
                      if (e.key === 'Escape') setRenamingPageId(null);
                    }}
                    onBlur={() => handleSaveRename(page.id)}
                    className="h-6 text-sm px-1 py-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="shrink-0 text-base leading-none">
                      {page.icon || <FileText className="w-3.5 h-3.5 opacity-60" />}
                    </span>
                    <span className="truncate">{page.title || (nt.untitled || 'Untitled')}</span>
                  </>
                )}
              </button>

              {isLeader && renamingPageId !== page.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => handleStartRename(page)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" />
                      {nt.rename || 'Rename'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEmojiPageId(page.id)}>
                      <Smile className="w-3.5 h-3.5 mr-2" />
                      {nt.changeIcon || 'Change icon'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeletingPage(page)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      {nt.delete || 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          {pages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {nt.noPages || 'No pages yet'}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Emoji Picker Popover */}
      {emojiPageId && (
        <Popover open={!!emojiPageId} onOpenChange={(open) => !open && setEmojiPageId(null)}>
          <PopoverTrigger asChild>
            <span className="sr-only">emoji trigger</span>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" side="right" align="start">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-base"
                  onClick={() => handleSelectEmoji(emojiPageId, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPage} onOpenChange={(open) => !open && setDeletingPage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{nt.confirmDeleteTitle || 'Delete page'}</AlertDialogTitle>
            <AlertDialogDescription>
              {nt.confirmDeleteDesc || 'Are you sure you want to delete this page? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{nt.cancel || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              {nt.delete || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
