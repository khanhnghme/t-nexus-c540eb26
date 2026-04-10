import { useState, useEffect, useMemo, useCallback } from 'react';
import { Mail, RefreshCw, Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import GmailConnect from './GmailConnect';
import { useGmailSync } from '@/hooks/useGmailSync';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

const PAGE_SIZE = 5;

interface GmailMessage {
  id: string;
  gmail_message_id: string;
  subject: string | null;
  snippet: string | null;
  from_email: string | null;
  from_name: string | null;
  received_at: string | null;
  is_read: boolean | null;
  labels: string[] | null;
}

function groupEmailsByDate(emails: GmailMessage[], locale: string) {
  const groups: { label: string; items: GmailMessage[] }[] = [];
  const map = new Map<string, GmailMessage[]>();
  for (const e of emails) {
    const d = new Date(e.received_at || e.id);
    let label: string;
    if (isToday(d)) label = locale === 'vi' ? 'Hôm nay' : 'Today';
    else if (isYesterday(d)) label = locale === 'vi' ? 'Hôm qua' : 'Yesterday';
    else if (isThisWeek(d)) label = locale === 'vi' ? 'Tuần này' : 'This week';
    else label = format(d, 'dd/MM/yyyy');
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(e);
  }
  for (const [label, items] of map) groups.push({ label, items });
  return groups;
}

export default function GmailTab() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const { translations: { app: t } } = useLanguage();
  const g = t?.gmail || {} as any;
  const dateLocale = locale === 'vi' ? viLocale : enUS;

  const { isConnected, isSyncing, isChecking, connectedEmail, connect, disconnect, syncEmails } = useGmailSync();
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 5 emails/page, 25 emails/sync = 5 pages per sync batch
  const PAGES_PER_BATCH = Math.floor(25 / PAGE_SIZE); // 5
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchEmails = useCallback(async (page: number) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from('gmail_messages')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setEmails((data as GmailMessage[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isConnected && !isChecking) fetchEmails(currentPage);
  }, [isConnected, isChecking, currentPage, fetchEmails]);

  // Auto-load more when user navigates beyond available data
  const handlePageChange = useCallback(async (page: number) => {
    // Check if we need more emails from Gmail
    const neededEmails = page * PAGE_SIZE;
    if (neededEmails > totalCount && nextPageToken && !isLoadingMore && !isSyncing) {
      setIsLoadingMore(true);
      try {
        const result = await syncEmails(nextPageToken);
        if (result?.nextPageToken) {
          setNextPageToken(result.nextPageToken);
        } else {
          setNextPageToken(null);
        }
      } finally {
        setIsLoadingMore(false);
      }
    }
    setCurrentPage(page);
  }, [totalCount, nextPageToken, isLoadingMore, isSyncing, syncEmails]);

  const handleSync = async () => {
    const result = await syncEmails();
    if (result?.nextPageToken) {
      setNextPageToken(result.nextPageToken);
    } else {
      setNextPageToken(null);
    }
    setCurrentPage(1);
    await fetchEmails(1);
  };

  const grouped = useMemo(() => groupEmailsByDate(emails, locale), [emails, locale]);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  if (!isChecking && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 opacity-30" />
        </div>
        <p className="text-base font-medium text-foreground mb-1">
          {g.notConnected || 'Gmail not connected'}
        </p>
        <p className="text-sm mb-4 text-center max-w-sm">
          {g.connectDesc || 'Connect your Gmail to view emails here'}
        </p>
        <GmailConnect
          isConnected={false}
          isChecking={false}
          connectedEmail={null}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
        <GmailConnect
          isConnected={isConnected}
          isChecking={isChecking}
          connectedEmail={connectedEmail}
          onConnect={connect}
          onDisconnect={disconnect}
        />
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalCount} email{totalCount !== 1 ? 's' : ''}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="gap-1.5">
            {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {g.syncNow || 'Sync'}
          </Button>
        </div>
      </div>

      {(isLoading || isChecking) ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-base font-medium text-foreground">
            {g.noEmails || 'No emails yet'}
          </p>
          <p className="text-sm mt-1">
            {g.syncNowDesc || 'Click Sync to fetch your latest emails'}
          </p>
        </div>
      ) : (
        <div>
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 px-6 py-2.5 bg-muted/30 border-b border-border/40">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-xs text-muted-foreground">{group.items.length}</span>
              </div>
              {group.items.map((email) => (
                <div
                  key={email.id}
                  className={cn(
                    "flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/30 border-b border-border/20 last:border-b-0",
                    !email.is_read && "bg-primary/[0.03]"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    !email.is_read ? "bg-primary/10" : "bg-muted/60"
                  )}>
                    <Mail className={cn("w-4 h-4", !email.is_read ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm leading-snug", !email.is_read && "font-semibold text-foreground")}>
                          {email.subject || '(No subject)'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {email.from_name || email.from_email || 'Unknown'}
                          {email.from_name && email.from_email && (
                            <span className="ml-1 opacity-60">&lt;{email.from_email}&gt;</span>
                          )}
                        </p>
                        {email.snippet && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.snippet}</p>
                        )}
                      </div>
                      {!email.is_read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    {email.received_at && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {formatDistanceToNow(new Date(email.received_at), { addSuffix: true, locale: dateLocale })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="py-4 border-t border-border/40">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={cn(currentPage === 1 && "pointer-events-none opacity-50", "cursor-pointer")}
                    />
                  </PaginationItem>
                  {getPageNumbers().map((p, i) =>
                    p === 'ellipsis' ? (
                      <PaginationItem key={`e-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={currentPage === p}
                          onClick={() => handlePageChange(p as number)}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={cn(currentPage === totalPages && "pointer-events-none opacity-50", "cursor-pointer")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
