import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Block } from '@blocknote/core';
import NotionEditor from './NotionEditor';
import NotionPageList, { type PageItem } from './NotionPageList';
import { Loader2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface CustomProjectViewProps {
  groupId: string;
  isLeader: boolean;
}

export default function CustomProjectView({ groupId, isLeader }: CustomProjectViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPages = useCallback(async () => {
    const { data, error } = await supabase
      .from('project_pages')
      .select('id, title, display_order, icon')
      .eq('group_id', groupId)
      .order('display_order');

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setPages(data || []);
    return data || [];
  }, [groupId, toast]);

  // Initial load — fetch pages, auto-create first page if empty
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setIsLoading(true);
      const fetched = await fetchPages();

      if (cancelled) return;

      if (!fetched || fetched.length === 0) {
        if (isLeader && user) {
          const { data: newPage } = await supabase
            .from('project_pages')
            .insert({ group_id: groupId, created_by: user.id, title: 'Untitled', content: [] as unknown as Json })
            .select('id, title, display_order, icon')
            .single();

          if (newPage && !cancelled) {
            setPages([newPage]);
            setSelectedPageId(newPage.id);
            setSelectedContent([]);
          }
        }
      } else {
        setSelectedPageId(fetched[0].id);
      }
      setIsLoading(false);
    };
    init();
    return () => { cancelled = true; };
  }, [groupId]);

  // Load content when selected page changes
  useEffect(() => {
    if (!selectedPageId) return;
    let cancelled = false;

    const loadContent = async () => {
      const { data } = await supabase
        .from('project_pages')
        .select('content')
        .eq('id', selectedPageId)
        .single();

      if (!cancelled && data) {
        setSelectedContent((data.content as unknown as Block[]) || []);
      }
    };
    loadContent();
    return () => { cancelled = true; };
  }, [selectedPageId]);

  const handleCreatePage = async () => {
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
      const maxOrder = pages.length > 0 ? Math.max(...pages.map(p => p.display_order)) + 1 : 0;
      const { data: newPage, error } = await supabase
        .from('project_pages')
        .insert({ group_id: groupId, created_by: user.id, title: 'Untitled', display_order: maxOrder, content: [] as unknown as Json })
        .select('id, title, display_order, icon')
        .single();

      if (error) throw error;
      if (newPage) {
        setPages(prev => [...prev, newPage]);
        setSelectedPageId(newPage.id);
        setSelectedContent([]);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenamePage = async (pageId: string, newTitle: string) => {
    const { error } = await supabase
      .from('project_pages')
      .update({ title: newTitle })
      .eq('id', pageId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, title: newTitle } : p));
  };

  const handleDeletePage = async (pageId: string) => {
    const { error } = await supabase
      .from('project_pages')
      .delete()
      .eq('id', pageId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setPages(prev => {
      const remaining = prev.filter(p => p.id !== pageId);
      if (selectedPageId === pageId) {
        setSelectedPageId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) setSelectedContent([]);
      }
      return remaining;
    });
  };

  const handleReorderPages = async (reorderedPages: PageItem[]) => {
    setPages(reorderedPages);

    const updates = reorderedPages.map((p, idx) =>
      supabase
        .from('project_pages')
        .update({ display_order: idx })
        .eq('id', p.id)
    );

    const results = await Promise.all(updates);
    const failed = results.find(r => r.error);
    if (failed?.error) {
      toast({ title: 'Error', description: failed.error.message, variant: 'destructive' });
      await fetchPages();
    }
  };

  const handleUpdateIcon = async (pageId: string, icon: string) => {
    const { error } = await supabase
      .from('project_pages')
      .update({ icon })
      .eq('id', pageId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, icon } : p));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[400px] rounded-lg border bg-background overflow-hidden">
      <div className="w-56 shrink-0">
        <NotionPageList
          pages={pages}
          selectedPageId={selectedPageId}
          onSelectPage={setSelectedPageId}
          onCreatePage={handleCreatePage}
          onRenamePage={handleRenamePage}
          onDeletePage={handleDeletePage}
          onReorderPages={handleReorderPages}
          onUpdateIcon={handleUpdateIcon}
          isCreating={isCreating}
          isLeader={isLeader}
        />
      </div>

      <div className="flex-1 min-w-0">
        {selectedPageId ? (
          <NotionEditor
            key={selectedPageId}
            pageId={selectedPageId}
            initialContent={selectedContent}
            editable={isLeader}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a page to start editing
          </div>
        )}
      </div>
    </div>
  );
}
