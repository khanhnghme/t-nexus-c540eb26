import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Redirects old /p/:projectSlug URLs to new /pr/ws-{wsShortId}/{projectSlug}
 */
export function LegacyProjectRedirect() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!projectSlug) return;
    resolveTarget();
  }, [projectSlug]);

  const resolveTarget = async () => {
    // Look up group by slug or short_id
    const isShort = /^[a-z0-9]{8}$/i.test(projectSlug!);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(projectSlug!);
    
    let groupData: any = null;
    if (isUuid) {
      const { data } = await supabase.from('groups').select('slug, workspace_id').eq('id', projectSlug!).maybeSingle();
      groupData = data;
    } else if (isShort) {
      const { data } = await supabase.from('groups').select('slug, workspace_id').eq('short_id', projectSlug!).maybeSingle();
      groupData = data;
    } else {
      const { data } = await supabase.from('groups').select('slug, workspace_id').eq('slug', projectSlug!).maybeSingle();
      groupData = data;
    }

    if (!groupData?.workspace_id) {
      // Fallback: can't resolve → 404
      setTarget('/groups');
      return;
    }

    // Get workspace short_id
    const { data: ws } = await (supabase as any).from('workspaces').select('short_id').eq('id', groupData.workspace_id).maybeSingle();
    if (ws?.short_id) {
      setTarget(`/pr/ws-${ws.short_id}/${groupData.slug || projectSlug}`);
    } else {
      setTarget('/groups');
    }
  };

  if (target) return <Navigate to={target} replace />;
  return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}

/**
 * Redirects old /p/:projectSlug/t/:taskSlug URLs
 */
export function LegacyTaskRedirect() {
  const { projectSlug, taskSlug } = useParams<{ projectSlug: string; taskSlug: string }>();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!projectSlug) return;
    resolve();
  }, [projectSlug, taskSlug]);

  const resolve = async () => {
    const { data: group } = await supabase.from('groups').select('slug, workspace_id').eq('slug', projectSlug!).maybeSingle();
    if (!group?.workspace_id) { setTarget('/groups'); return; }
    
    const { data: ws } = await (supabase as any).from('workspaces').select('short_id').eq('id', group.workspace_id).maybeSingle();
    if (ws?.short_id) {
      setTarget(`/pr/ws-${ws.short_id}/${group.slug || projectSlug}${taskSlug ? `/t/${taskSlug}` : ''}`);
    } else {
      setTarget('/groups');
    }
  };

  if (target) return <Navigate to={target} replace />;
  return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}

/**
 * Redirects old /p/:projectSlug/page/:pageSlug URLs to /pa/ws-{wsShortId}/{pageSlug}
 */
export function LegacyPageRedirect() {
  const { projectSlug, pageSlug } = useParams<{ projectSlug: string; pageSlug: string }>();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!projectSlug) return;
    resolve();
  }, [projectSlug, pageSlug]);

  const resolve = async () => {
    const { data: group } = await supabase.from('groups').select('slug, workspace_id').eq('slug', projectSlug!).maybeSingle();
    if (!group?.workspace_id) { setTarget('/groups'); return; }
    
    const { data: ws } = await (supabase as any).from('workspaces').select('short_id').eq('id', group.workspace_id).maybeSingle();
    if (ws?.short_id) {
      setTarget(`/pa/ws-${ws.short_id}/${group.slug || projectSlug}`);
    } else {
      setTarget('/groups');
    }
  };

  if (target) return <Navigate to={target} replace />;
  return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}

/**
 * Redirects old /p/:projectSlug/t/:taskSlug/f/:fileIndex URLs
 */
export function LegacyFileRedirect() {
  const { projectSlug, taskSlug, fileIndex } = useParams<{ projectSlug: string; taskSlug: string; fileIndex: string }>();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!projectSlug) return;
    resolve();
  }, [projectSlug, taskSlug, fileIndex]);

  const resolve = async () => {
    const { data: group } = await supabase.from('groups').select('slug, workspace_id').eq('slug', projectSlug!).maybeSingle();
    if (!group?.workspace_id) { setTarget('/groups'); return; }
    
    const { data: ws } = await (supabase as any).from('workspaces').select('short_id').eq('id', group.workspace_id).maybeSingle();
    if (ws?.short_id) {
      setTarget(`/pr/ws-${ws.short_id}/${group.slug || projectSlug}/t/${taskSlug}/f/${fileIndex || '0'}`);
    } else {
      setTarget('/groups');
    }
  };

  if (target) return <Navigate to={target} replace />;
  return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}

/**
 * Redirects old /groups/:groupId URLs
 */
export function LegacyGroupRedirect() {
  const { groupId } = useParams<{ groupId: string }>();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    resolve();
  }, [groupId]);

  const resolve = async () => {
    const { data: group } = await supabase.from('groups').select('slug, workspace_id').eq('id', groupId!).maybeSingle();
    if (!group?.workspace_id) { setTarget('/groups'); return; }
    
    const { data: ws } = await (supabase as any).from('workspaces').select('short_id').eq('id', group.workspace_id).maybeSingle();
    if (ws?.short_id) {
      setTarget(`/pr/ws-${ws.short_id}/${group.slug || groupId}`);
    } else {
      setTarget('/groups');
    }
  };

  if (target) return <Navigate to={target} replace />;
  return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}
