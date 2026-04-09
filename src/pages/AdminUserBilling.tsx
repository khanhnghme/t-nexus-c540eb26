import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, CalendarPlus, ShieldOff, ShieldCheck, StickyNote, History, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const PLAN_LABELS: Record<string, string> = {
  plan_free: 'Free', plan_plus: 'Plus', plan_pro: 'Pro', plan_business: 'Business', plan_custom: 'Custom',
};
const PLAN_COLORS: Record<string, string> = {
  plan_free: 'bg-muted text-muted-foreground',
  plan_plus: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  plan_pro: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  plan_business: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  plan_custom: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  expired: 'bg-destructive/10 text-destructive',
  trial: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  suspended: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  grace_period: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function AdminUserBilling() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling;
  const o = t?.overview;
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-billing-user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch plan limits for this user's plan
  const { data: planLimits } = useQuery({
    queryKey: ['plan-limits', profile?.user_plan],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan', profile!.user_plan)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_plan,
  });

  // Fetch usage counts
  const { data: usage } = useQuery({
    queryKey: ['admin-billing-usage', userId],
    queryFn: async () => {
      const [wsRes, projRes] = await Promise.all([
        supabase.from('workspaces' as any).select('id', { count: 'exact', head: true }).eq('owner_id', userId!),
        supabase.from('groups').select('id', { count: 'exact', head: true }),
      ]);
      // Get unique members count + storage via RPC
      const [membersRes, storageRes] = await Promise.all([
        supabase.rpc('get_account_unique_members', { _owner_id: userId! }),
        supabase.rpc('get_account_storage_usage', { _owner_id: userId! }),
      ]);
      return {
        workspaces: (wsRes as any).count || 0,
        projects: (projRes as any).count || 0,
        members: (membersRes.data as number) || 0,
        storageMb: Math.round((storageRes.data as number) || 0),
      };
    },
    enabled: !!userId,
  });

  const copyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      toast({ title: 'Copied', description: 'User ID copied' });
    }
  };

  if (isLoading || !profile) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  const statusLabel = (s: string) => t?.planStatus?.[s] || s;
  const sourceLabel = (s: string) => t?.planSource?.[s] || s;
  const cycleLabel = (s: string) => t?.billingCycle?.[s] || s;

  const quickActions = [
    { label: o?.upgrade || 'Upgrade', icon: ArrowUpCircle, color: 'text-emerald-500' },
    { label: o?.downgrade || 'Downgrade', icon: ArrowDownCircle, color: 'text-orange-500' },
    { label: o?.extend || 'Extend', icon: CalendarPlus, color: 'text-blue-500' },
    { label: o?.suspend || 'Suspend', icon: ShieldOff, color: 'text-destructive' },
    { label: o?.restore || 'Restore', icon: ShieldCheck, color: 'text-emerald-500' },
    { label: o?.addNote || 'Add Note', icon: StickyNote, color: 'text-violet-500' },
    { label: o?.viewHistory || 'View History', icon: History, color: 'text-muted-foreground' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/billing')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t?.backToList || 'Back to list'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t?.tabs?.overview || 'Overview'}</TabsTrigger>
          <TabsTrigger value="payments">{t?.tabs?.payments || 'Payments'}</TabsTrigger>
          <TabsTrigger value="history">{t?.tabs?.planHistory || 'Plan History'}</TabsTrigger>
          <TabsTrigger value="notes">{t?.tabs?.notes || 'Internal Notes'}</TabsTrigger>
        </TabsList>

        {/* ═══ Overview Tab ═══ */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* User Info Card */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">{o?.userInfo || 'User Information'}</h3>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback>{profile.full_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg">{profile.full_name}</div>
                <div className="text-sm text-muted-foreground">{profile.email}</div>
                <div className="flex items-center gap-1 mt-1">
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{userId?.slice(0, 8)}...</code>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyId}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Details Card */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">{o?.planDetails || 'Plan Details'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{o?.currentPlan || 'Current Plan'}</div>
                <Badge className={PLAN_COLORS[profile.user_plan] || ''} variant="secondary">
                  {PLAN_LABELS[profile.user_plan] || profile.user_plan}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t?.columns?.status || 'Status'}</div>
                <Badge className={STATUS_COLORS[profile.plan_status] || ''} variant="secondary">
                  {statusLabel(profile.plan_status)}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t?.columns?.source || 'Source'}</div>
                <span className="text-sm">{sourceLabel(profile.plan_source)}</span>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{o?.planStarted || 'Started'}</div>
                <span className="text-sm">{profile.plan_started_at ? format(new Date(profile.plan_started_at), 'dd/MM/yyyy') : '—'}</span>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{o?.planExpires || 'Expires'}</div>
                <span className="text-sm">{profile.plan_expires_at ? format(new Date(profile.plan_expires_at), 'dd/MM/yyyy') : (o?.neverExpires || 'Never')}</span>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t?.columns?.cycle || 'Cycle'}</div>
                <span className="text-sm">{cycleLabel(profile.billing_cycle)}</span>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{o?.autoRenew || 'Auto Renew'}</div>
                <Badge variant={profile.auto_renew ? 'default' : 'secondary'}>
                  {profile.auto_renew ? (o?.on || 'On') : (o?.off || 'Off')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Limits & Usage */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{o?.currentLimits || 'Current Limits'}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{o?.workspaces || 'Workspaces'}</span><span className="font-medium">{planLimits?.max_workspaces ?? '—'}</span></div>
                <div className="flex justify-between"><span>{o?.projects || 'Projects'}</span><span className="font-medium">{planLimits?.max_projects_per_workspace ?? '—'}</span></div>
                <div className="flex justify-between"><span>{o?.members || 'Members'}</span><span className="font-medium">{planLimits?.max_members_per_workspace ?? '—'}</span></div>
                <div className="flex justify-between"><span>{o?.storage || 'Storage'}</span><span className="font-medium">{planLimits?.max_storage_mb ? `${planLimits.max_storage_mb} MB` : '—'}</span></div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{o?.currentUsage || 'Current Usage'}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{o?.workspaces || 'Workspaces'}</span><span className="font-medium">{usage?.workspaces ?? '—'}</span></div>
                <div className="flex justify-between"><span>{o?.projects || 'Projects'}</span><span className="font-medium">{usage?.projects ?? '—'}</span></div>
                <div className="flex justify-between"><span>{o?.members || 'Members'}</span><span className="font-medium">{usage?.members ?? '—'}</span></div>
                <div className="flex justify-between"><span>{o?.storage || 'Storage'}</span><span className="font-medium">{usage?.storageMb ?? 0} MB</span></div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{o?.quickActions || 'Quick Actions'}</h3>
            <div className="flex flex-wrap gap-2">
              {quickActions.map(a => (
                <Button
                  key={a.label}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => toast({ title: t?.comingSoon || 'Coming soon', description: 'Phase 3' })}
                >
                  <a.icon className={`h-4 w-4 ${a.color}`} />
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ═══ Placeholder Tabs ═══ */}
        <TabsContent value="payments">
          <div className="text-center py-16 text-muted-foreground">{t?.comingSoon || 'Coming in the next phase'}</div>
        </TabsContent>
        <TabsContent value="history">
          <div className="text-center py-16 text-muted-foreground">{t?.comingSoon || 'Coming in the next phase'}</div>
        </TabsContent>
        <TabsContent value="notes">
          <div className="text-center py-16 text-muted-foreground">{t?.comingSoon || 'Coming in the next phase'}</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
