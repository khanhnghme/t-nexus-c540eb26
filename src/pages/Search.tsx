import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Search as SearchIcon,
  FolderKanban,
  CheckSquare,
  Users,
  FileText,
  Video,
  MessageSquare,
  ArrowRight,
  Globe,
  Lock,
} from 'lucide-react';

type SearchCategory = 'all' | 'projects' | 'tasks' | 'members' | 'resources' | 'meetings' | 'feedback';

interface SearchResult {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle?: string;
  href: string;
  icon: typeof FolderKanban;
  meta?: string;
}

export default function SearchPage() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const t = translations.app?.search;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<SearchCategory>('all');

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2 || !user) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const doSearch = async () => {
      setLoading(true);
      const q = `%${debouncedQuery}%`;
      const wsId = activeWorkspace?.id;
      const wsShortId = activeWorkspace?.short_id;

      const [projectsRes, tasksRes, membersRes, resourcesRes, meetingsRes, feedbackRes] = await Promise.all([
        // Projects
        supabase
          .from('groups')
          .select('id, name, description, class_code, slug, is_public, workspace_id, project_mode')
          .or(`name.ilike.${q},description.ilike.${q},class_code.ilike.${q}`)
          .limit(20),
        // Tasks
        supabase
          .from('tasks')
          .select('id, title, description, status, group_id, slug, groups!inner(slug, workspace_id, project_mode)')
          .or(`title.ilike.${q},description.ilike.${q}`)
          .limit(20),
        // Members (profiles)
        supabase
          .from('profiles')
          .select('id, full_name, email, username, avatar_url')
          .or(`full_name.ilike.${q},email.ilike.${q},username.ilike.${q}`)
          .limit(20),
        // Resources
        supabase
          .from('resources')
          .select('id, file_name, group_id, groups!inner(slug, workspace_id, project_mode)')
          .ilike('file_name', q)
          .limit(20),
        // Meetings
        supabase
          .from('meetings')
          .select('id, title, group_id, scheduled_at, groups!inner(slug, workspace_id, project_mode)')
          .ilike('title', q)
          .limit(20),
        // Feedback
        supabase
          .from('feedbacks')
          .select('id, title, content, status, type')
          .or(`title.ilike.${q},content.ilike.${q}`)
          .limit(20),
      ]);

      if (cancelled) return;

      const all: SearchResult[] = [];

      // Map projects
      (projectsRes.data || []).forEach((p: any) => {
        const prefix = p.project_mode === 'custom' ? '/pa' : '/pr';
        const href = wsShortId && p.workspace_id === wsId
          ? `${prefix}/ws-${wsShortId}/${p.slug || p.id}`
          : `/p/${p.slug || p.id}`;
        all.push({
          id: p.id,
          type: 'projects',
          title: p.name,
          subtitle: p.description?.slice(0, 100) || p.class_code || undefined,
          href,
          icon: FolderKanban,
          meta: p.is_public ? '🌐' : '🔒',
        });
      });

      // Map tasks
      (tasksRes.data || []).forEach((tk: any) => {
        const g = tk.groups;
        const prefix = g?.project_mode === 'custom' ? '/pa' : '/pr';
        const href = wsShortId && g?.workspace_id === wsId
          ? `${prefix}/ws-${wsShortId}/${g.slug}/t/${tk.slug || tk.id}`
          : `/p/${g?.slug}/t/${tk.slug || tk.id}`;
        all.push({
          id: tk.id,
          type: 'tasks',
          title: tk.title,
          subtitle: tk.description?.slice(0, 100) || undefined,
          href,
          icon: CheckSquare,
          meta: tk.status,
        });
      });

      // Map members
      (membersRes.data || []).forEach((m: any) => {
        all.push({
          id: m.id,
          type: 'members',
          title: m.full_name || m.email || 'Unknown',
          subtitle: m.email,
          href: m.username ? `/u/${m.username}` : `/personal-info`,
          icon: Users,
        });
      });

      // Map resources
      (resourcesRes.data || []).forEach((r: any) => {
        const g = r.groups;
        const prefix = g?.project_mode === 'custom' ? '/pa' : '/pr';
        const href = wsShortId && g?.workspace_id === wsId
          ? `${prefix}/ws-${wsShortId}/${g.slug}`
          : `/p/${g?.slug}`;
        all.push({
          id: r.id,
          type: 'resources',
          title: r.file_name,
          href,
          icon: FileText,
        });
      });

      // Map meetings
      (meetingsRes.data || []).forEach((mt: any) => {
        const g = mt.groups;
        const prefix = g?.project_mode === 'custom' ? '/pa' : '/pr';
        const href = wsShortId && g?.workspace_id === wsId
          ? `${prefix}/ws-${wsShortId}/${g.slug}`
          : `/p/${g?.slug}`;
        all.push({
          id: mt.id,
          type: 'meetings',
          title: mt.title,
          subtitle: mt.scheduled_at ? new Date(mt.scheduled_at).toLocaleDateString() : undefined,
          href,
          icon: Video,
        });
      });

      // Map feedback
      (feedbackRes.data || []).forEach((fb: any) => {
        all.push({
          id: fb.id,
          type: 'feedback',
          title: fb.title,
          subtitle: fb.content?.slice(0, 100) || undefined,
          href: '/feedback',
          icon: MessageSquare,
          meta: fb.status,
        });
      });

      setResults(all);
      setLoading(false);
    };

    doSearch();
    return () => { cancelled = true; };
  }, [debouncedQuery, user, activeWorkspace]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return results;
    return results.filter(r => r.type === activeTab);
  }, [results, activeTab]);

  const counts = useMemo(() => {
    const c: Record<SearchCategory, number> = { all: results.length, projects: 0, tasks: 0, members: 0, resources: 0, meetings: 0, feedback: 0 };
    results.forEach(r => { c[r.type]++; });
    return c;
  }, [results]);

  // Highlight keyword in text
  const highlight = useCallback((text: string) => {
    if (!debouncedQuery || debouncedQuery.length < 2) return text;
    const regex = new RegExp(`(${debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</mark>
        : part
    );
  }, [debouncedQuery]);

  const tabItems: { key: SearchCategory; label: string }[] = [
    { key: 'all', label: t?.tabAll || 'All' },
    { key: 'projects', label: t?.tabProjects || 'Projects' },
    { key: 'tasks', label: t?.tabTasks || 'Tasks' },
    { key: 'members', label: t?.tabMembers || 'Members' },
    { key: 'resources', label: t?.tabResources || 'Resources' },
    { key: 'meetings', label: t?.tabMeetings || 'Meetings' },
    { key: 'feedback', label: t?.tabFeedback || 'Feedback' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t?.title || 'Search'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t?.description || 'Search across all your projects, tasks, members and more'}
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t?.placeholder || 'Type to search...'}
          className="pl-12 h-12 text-base rounded-xl"
        />
      </div>

      {/* Tabs */}
      {debouncedQuery.length >= 2 && (
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as SearchCategory)}>
          <TabsList className="flex-wrap h-auto gap-1">
            {tabItems.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                    {counts[tab.key]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  {t?.noResults || 'No results found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(item => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => navigate(item.href)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-all text-left group"
                  >
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {highlight(item.title)}
                        </span>
                        {item.meta && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                            {item.meta}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {highlight(item.subtitle)}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state - before search */}
      {debouncedQuery.length < 2 && (
        <div className="text-center py-20">
          <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-sm">
            {t?.hint || 'Enter at least 2 characters to search'}
          </p>
        </div>
      )}
    </div>
  );
}
