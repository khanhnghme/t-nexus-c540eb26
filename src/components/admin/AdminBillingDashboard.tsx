import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CheckCircle, XCircle, TrendingUp, RefreshCw, UserMinus, Users } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

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

export function AdminBillingDashboard() {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.dashboard;
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const { data: planDistribution = [] } = useQuery({
    queryKey: ['admin-billing-plan-distribution'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_plan');
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((p: any) => { counts[p.user_plan] = (counts[p.user_plan] || 0) + 1; });
      return Object.entries(counts).map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count);
    },
  });

  const { data: payments = { total: 0, success: 0, failed: 0, revenue: 0 } } = useQuery({
    queryKey: ['admin-billing-payments-month', monthStart],
    queryFn: async () => {
      const { data } = await supabase.from('payment_history').select('status, final_amount, amount').gte('created_at', monthStart).lte('created_at', monthEnd);
      if (!data) return { total: 0, success: 0, failed: 0, revenue: 0 };
      const success = data.filter((p: any) => p.status === 'paid');
      const failed = data.filter((p: any) => p.status === 'failed');
      const revenue = success.reduce((sum: number, p: any) => sum + Number(p.final_amount || p.amount || 0), 0);
      return { total: data.length, success: success.length, failed: failed.length, revenue };
    },
  });

  const { data: planChanges = { upgrades: 0, renewals: 0, cancellations: 0 } } = useQuery({
    queryKey: ['admin-billing-plan-changes-month', monthStart],
    queryFn: async () => {
      const { data } = await supabase.from('plan_change_logs').select('action_type').gte('created_at', monthStart).lte('created_at', monthEnd);
      if (!data) return { upgrades: 0, renewals: 0, cancellations: 0 };
      return {
        upgrades: data.filter((c: any) => c.action_type === 'upgrade').length,
        renewals: data.filter((c: any) => c.action_type === 'renew' || c.action_type === 'extend').length,
        cancellations: data.filter((c: any) => c.action_type === 'cancel' || c.action_type === 'suspend').length,
      };
    },
  });

  const totalUsers = planDistribution.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...planDistribution.map(d => d.count), 1);

  const kpis = [
    { label: t?.revenue || 'Revenue', value: `$${payments.revenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t?.paymentsSuccess || 'Paid', value: payments.success, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t?.paymentsFailed || 'Failed', value: payments.failed, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: t?.upgrades || 'Upgrades', value: planChanges.upgrades, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t?.renewals || 'Renewals', value: planChanges.renewals, icon: RefreshCw, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: t?.cancellations || 'Cancellations', value: planChanges.cancellations, icon: UserMinus, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t?.monthlyOverview || 'Monthly overview'} — {now.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${k.bg}`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t?.planDistribution || 'Plan Distribution'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {planDistribution.map(d => {
              const pct = totalUsers > 0 ? ((d.count / totalUsers) * 100).toFixed(1) : '0';
              return (
                <div key={d.plan} className="flex items-center gap-3">
                  <Badge className={`${PLAN_COLORS[d.plan] || ''} min-w-[80px] justify-center`} variant="secondary">
                    {PLAN_LABELS[d.plan] || d.plan}
                  </Badge>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${(d.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium min-w-[60px] text-right">{d.count} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
          {totalUsers > 0 && (
            <p className="text-xs text-muted-foreground mt-3">{t?.totalUsers || 'Total users'}: {totalUsers}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
