import { useState } from 'react';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface PageItem {
  id: string;
  title: string;
  display_order: number;
}

interface NotionPageListProps {
  pages: PageItem[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => Promise<void>;
  isCreating?: boolean;
}

export default function NotionPageList({ pages, selectedPageId, onSelectPage, onCreatePage, isCreating }: NotionPageListProps) {
  const { translations: { app: t } } = useLanguage();
  const nt = (t as any).notionEditor || {};

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
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors',
                selectedPageId === page.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted text-foreground'
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="truncate">{page.title || (nt.untitled || 'Untitled')}</span>
            </button>
          ))}
          {pages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {nt.noPages || 'No pages yet'}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
