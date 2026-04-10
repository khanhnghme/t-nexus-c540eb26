import { useState, useEffect, useMemo } from 'react';
import { Mail, RefreshCw, Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import GmailConnect from './GmailConnect';
import { useGmailSync } from '@/hooks/useGmailSync';

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

  const fetchEmails = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gmail_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setEmails((data as GmailMessage[]) || []);
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && !isChecking) fetchEmails();
  }, [isConnected, isChecking, user?.id]);

  const handleSync = async () => {
    await syncEmails();
    await fetchEmails();
  };

  const grouped = useMemo(() => groupEmailsByDate(emails, locale), [emails, locale]);

  // Not connected state
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
      {/* Header with sync */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
        <GmailConnect
          isConnected={isConnected}
          isChecking={isChecking}
          connectedEmail={connectedEmail}
          onConnect={connect}
          onDisconnect={disconnect}
        />
        <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="gap-1.5">
          {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {g.syncNow || 'Sync'}
        </Button>
      </div>

      {/* Loading */}
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
                  {/* Icon */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    !email.is_read ? "bg-primary/10" : "bg-muted/60"
                  )}>
                    <Mail className={cn("w-4 h-4", !email.is_read ? "text-primary" : "text-muted-foreground")} />
                  </div>

                  {/* Content */}
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
        </div>
      )}
    </div>
  );
}
