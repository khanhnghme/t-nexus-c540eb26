import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowUpCircle, ArrowDownCircle, CalendarPlus, ShieldOff, ShieldCheck,
  RefreshCw, History, ChevronDown, Clock, User, StickyNote,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const ACTION_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  upgrade:   { icon: ArrowUpCircle,  color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  downgrade: { icon: ArrowDownCircle, color: 'text-orange-500',  bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  renew:     { icon: RefreshCw,      color: 'text-blue-500',    bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  extend:    { icon: CalendarPlus,   color: 'text-blue-500',    bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  suspend:   { icon: ShieldOff,      color: 'text-destructive', bgColor: 'bg-destructive/10' },
  restore:   { icon: ShieldCheck,    color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  cancel:    { icon: ShieldOff,      color: 'text-muted-foreground', bgColor: 'bg-muted' },
  create:    { icon: CalendarPlus,   color: 'text-primary',     bgColor: 'bg-primary/10' },
};

const PLAN_LABELS: Record<string, string> = {
  plan_free: 'Free', plan_plus: 'Plus', plan_pro: 'Pro', plan_business: 'Business', plan_custom: 'Custom',
};

const SOURCE_COLORS: Record<string, string> = {
  admin_manual: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  system_auto: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  user_action: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  payment: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

interface UserPlanHistoryTabProps {
  userId: string;
}

export function UserPlanHistoryTab({ userId }: UserPlanHistoryTabProps) {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.planHistory;
  const [actionFilter, setActionFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-plan-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_change_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch performer names
  const performerIds = [...new Set(logs.map(l => l.performed_by).filter(Boolean))] as string[];
  const { data: performers = [] } = useQuery({
    queryKey: ['admin-performers', performerIds],
    queryFn: async () => {
      if (performerIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', performerIds);
      return data || [];
    },
    enabled: performerIds.length > 0,
  });

  const performerMap = Object.fromEntries(performers.map(p => [p.id, p.full_name]));

  const filtered = logs.filter(l => {
    if (actionFilter !== 'all' && l.action_type !== actionFilter) return false;
    if (sourceFilter !== 'all' && l.change_source !== sourceFilter) return false;
    return true;
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t?.allActions || 'All Actions'}</SelectItem>
            {Object.keys(ACTION_CONFIG).map(a => (
              <SelectItem key={a} value={a}>{t?.actionType?.[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t?.allSources || 'All Sources'}</SelectItem>
            <SelectItem value="admin_manual">{t?.source?.admin_manual || 'Admin Manual'}</SelectItem>
            <SelectItem value="system_auto">{t?.source?.system_auto || 'System Auto'}</SelectItem>
            <SelectItem value="user_action">{t?.source?.user_action || 'User Action'}</SelectItem>
            <SelectItem value="payment">{t?.source?.payment || 'Payment'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <History className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">{t?.empty || 'No plan changes recorded'}</p>
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-1">
            {filtered.map((log, i) => {
              const config = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.create;
              const Icon = config.icon;
              const hasDetails = !!(log.reason || log.internal_note);

              const content = (
                <div className="relative group">
                  {/* Icon dot */}
                  <div className={`absolute -left-8 top-3 w-[30px] h-[30px] rounded-full flex items-center justify-center ${config.bgColor} ring-2 ring-background`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  <div className="rounded-xl border bg-card p-4 ml-2 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Action title */}
                        <div className="font-medium text-sm">
                          {t?.actionType?.[log.action_type] || log.action_type}
                          {log.old_plan && log.new_plan && (
                            <span className="text-muted-foreground font-normal">
                              {' '}{PLAN_LABELS[log.old_plan] || log.old_plan} → {PLAN_LABELS[log.new_plan] || log.new_plan}
                            </span>
                          )}
                        </div>

                        {/* Meta badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <Badge className={SOURCE_COLORS[log.change_source] || 'bg-muted text-muted-foreground'} variant="secondary">
                            {t?.source?.[log.change_source] || log.change_source}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {t?.effectiveMode?.[log.effective_mode] || log.effective_mode}
                          </Badge>
                          {log.performed_by && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {performerMap[log.performed_by] || 'System'}
                            </span>
                          )}
                        </div>

                        {/* Expiry change */}
                        {(log.old_expires_at || log.new_expires_at) && (
                          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.old_expires_at ? format(new Date(log.old_expires_at), 'dd/MM/yy') : '∞'}
                            {' → '}
                            {log.new_expires_at ? format(new Date(log.new_expires_at), 'dd/MM/yy') : '∞'}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible reason/note */}
                    {hasDetails && (
                      <CollapsibleContent className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        {log.reason && (
                          <div className="text-xs">
                            <span className="text-muted-foreground font-medium">{t?.reason || 'Reason'}:</span>{' '}
                            <span>{log.reason}</span>
                          </div>
                        )}
                        {log.internal_note && (
                          <div className="text-xs flex items-start gap-1">
                            <StickyNote className="h-3 w-3 text-violet-500 mt-0.5 shrink-0" />
                            <span className="italic text-muted-foreground">{log.internal_note}</span>
                          </div>
                        )}
                      </CollapsibleContent>
                    )}
                  </div>
                </div>
              );

              if (hasDetails) {
                return (
                  <Collapsible key={log.id}>
                    <CollapsibleTrigger asChild>
                      <div className="cursor-pointer">{content}</div>
                    </CollapsibleTrigger>
                  </Collapsible>
                );
              }

              return <div key={log.id}>{content}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
