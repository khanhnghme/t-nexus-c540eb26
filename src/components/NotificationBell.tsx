import { useState, useEffect, useMemo } from 'react';
import { Bell, Trash2, Check, Clock, CheckCircle2, Send, UserPlus, Edit, X as XIcon, MailOpen, Loader2, Inbox, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { deleteWithUndo } from '@/lib/deleteWithUndo';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  task_id: string | null;
  group_id: string | null;
  is_read: boolean;
  created_at: string;
  tasks?: {
    title: string;
    deadline: string | null;
    status: string;
    groups?: { name: string };
  } | null;
}

type TabFilter = 'all' | 'unread' | 'read';

const ICON_MAP: Record<string, React.ReactNode> = {
  task_assigned: <UserPlus className="w-4 h-4 text-primary" />,
  task_deadline: <Clock className="w-4 h-4 text-warning" />,
  task_updated: <Edit className="w-4 h-4 text-blue-500" />,
  task_verified: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  task_submitted: <Send className="w-4 h-4 text-primary" />,
  project_invited: <MailOpen className="w-4 h-4 text-primary" />,
  invitation_accepted: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  invitation_declined: <XIcon className="w-4 h-4 text-destructive" />,
};

function groupByDate(notifications: Notification[], labels: { today: string; yesterday: string; thisWeek: string }) {
  const groups: { label: string; items: Notification[] }[] = [];
  const map = new Map<string, Notification[]>();
  for (const n of notifications) {
    const d = new Date(n.created_at);
    let label: string;
    if (isToday(d)) label = labels.today;
    else if (isYesterday(d)) label = labels.yesterday;
    else if (isThisWeek(d)) label = labels.thisWeek;
    else label = format(d, 'dd/MM/yyyy');
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  }
  for (const [label, items] of map) groups.push({ label, items });
  return groups;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [open, setOpen] = useState(false);
  const PAGE_SIZE = 30;

  const fetchNotifications = async (append = false) => {
    if (!user) return;
    if (append) setLoadingMore(true); else setIsLoading(true);
    try {
      const offset = append ? notifications.length : 0;
      const { data, error } = await supabase
        .from('notifications')
        .select(`*, tasks (title, deadline, status, groups (name))`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE);
      if (error) throw error;
      const fetched = (data as Notification[]) || [];
      setHasMore(fetched.length > PAGE_SIZE);
      const trimmed = fetched.slice(0, PAGE_SIZE);
      if (append) {
        setNotifications(prev => [...prev, ...trimmed]);
      } else {
        setNotifications(trimmed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  // Fetch on open
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, user]);

  // Realtime for badge count
  useEffect(() => {
    if (!user) return;
    // Initial count fetch
    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      // We only track unread for the badge - full data loads on open
      if (!open) {
        // Just update the badge count without full fetch
      }
    };
    fetchCount();

    const channel = supabase
      .channel('notif-bell-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 2000);
        if (open) fetchNotifications();
        else fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, open]);

  const filtered = useMemo(() => {
    if (tab === 'unread') return notifications.filter(n => !n.is_read);
    if (tab === 'read') return notifications.filter(n => n.is_read);
    return notifications;
  }, [notifications, tab]);

  const grouped = useMemo(() => groupByDate(filtered, { today: t.today, yesterday: t.yesterday, thisWeek: t.thisWeek }), [filtered, t]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    toast.success(t.markedAllRead);
  };

  const deleteNotification = (id: string) => {
    const deleted = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    deleteWithUndo({
      description: t.deletedNotif,
      onDelete: async () => { await supabase.from('notifications').delete().eq('id', id); },
      onUndo: () => { if (deleted) setNotifications(prev => [deleted, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())); },
    });
  };

  const deleteAll = () => {
    if (!user) return;
    const saved = [...notifications];
    setNotifications([]);
    deleteWithUndo({
      description: t.deletedAll,
      onDelete: async () => { await supabase.from('notifications').delete().eq('user_id', user.id); },
      onUndo: () => setNotifications(saved),
    });
  };

  const getTimeRemaining = (notification: Notification) => {
    const deadline = notification.tasks?.deadline;
    const taskStatus = notification.tasks?.status;
    if (!deadline) return null;
    // Don't show deadline badge for submission notifications — they submitted already
    if (notification.type === 'task_submitted') return null;
    // Don't show "Quá hạn" if task is already completed
    if (taskStatus === 'DONE' || taskStatus === 'VERIFIED') return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return <Badge variant="destructive" className="text-[10px] h-4">{t.overdue}</Badge>;
    if (diff < 24 * 60 * 60 * 1000) return <Badge className="text-[10px] h-4 bg-warning text-warning-foreground">{t.nearDeadline}</Badge>;
    return null;
  };

  // Count for badge (use notifications if loaded, otherwise track separately)
  const [badgeCount, setBadgeCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setBadgeCount(count || 0);
    };
    fetch();
  }, [user, notifications]);

  const displayCount = open ? unreadCount : badgeCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative text-[var(--_sb-muted)] hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all focus-visible:ring-0",
            hasNewNotification && "animate-pulse"
          )}
        >
          <Bell className={cn(
            "w-[18px] h-[18px] transition-transform",
            hasNewNotification && "animate-[wiggle_0.5s_ease-in-out_3]"
          )} strokeWidth={2} />
          {displayCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 bg-destructive text-destructive-foreground text-xs font-bold">
              {displayCount > 9 ? '9+' : displayCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[420px] p-0 rounded-xl shadow-xl border-border/60 bg-popover"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
              <p className="text-[11px] text-muted-foreground">
                {unreadCount > 0 ? t.unreadCount.replace('{count}', String(unreadCount)) : t.allRead}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground">
                <Check className="w-3 h-3" />
                {t.markAllRead}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={deleteAll} className="h-7 px-2 text-[11px] gap-1 text-destructive/70 hover:text-destructive">
                <Trash2 className="w-3 h-3" />
                {t.deleteAll}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
            <TabsList className="w-full h-8 bg-muted/50 border border-border/40 p-0.5">
              <TabsTrigger value="all" className="flex-1 text-[11px] h-6 gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Inbox className="w-3 h-3" />
                {t.tabAll}
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 text-[11px] h-6 gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Filter className="w-3 h-3" />
                {t.tabUnread}
                {unreadCount > 0 && (
                  <span className="ml-0.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1 min-w-[16px] text-center leading-4">{unreadCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="read" className="flex-1 text-[11px] h-6 gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <CheckCircle2 className="w-3 h-3" />
                {t.tabRead}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-xs">{t.loading}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 opacity-30" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {tab === 'unread' ? t.noUnread : t.noNotifications}
              </p>
              <p className="text-[11px] mt-0.5">
                {tab === 'unread' ? t.allReadMsg : t.willNotify}
              </p>
            </div>
          ) : (
            <div className="pb-2">
              {grouped.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 px-4 py-1.5 sticky top-0 bg-popover/95 backdrop-blur-sm z-10">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10px] text-muted-foreground">{group.items.length}</span>
                  </div>
                  {group.items.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40 cursor-pointer group",
                        !n.is_read && "bg-primary/[0.04]"
                      )}
                      onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        !n.is_read ? "bg-primary/10" : "bg-muted/60"
                      )}>
                        {ICON_MAP[n.type] || <Bell className="w-4 h-4 text-muted-foreground" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-[13px] leading-snug", !n.is_read && "font-semibold text-foreground")}>
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            )}
                          </div>
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>

                        {/* Task context */}
                        {n.tasks && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{n.tasks.groups?.name || 'Project'}</Badge>
                            {getTimeRemaining(n)}
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: locale === 'vi' ? viLocale : undefined })}
                        </p>
                      </div>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center py-3">
                  <Button variant="ghost" size="sm" onClick={() => fetchNotifications(true)} disabled={loadingMore} className="gap-1.5 text-[11px] h-7 text-muted-foreground">
                    {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                    {t.loadMore}
                  </Button>
                </div>
              )}
              {!hasMore && filtered.length > 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-2">{t.showedAll}</p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
