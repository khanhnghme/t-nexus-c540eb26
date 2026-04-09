import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Users, FolderOpen, HardDrive, Building2 } from 'lucide-react';

import { PLAN_CONFIG, getPlanLabel, getPlanBadgeClass, getPlanColor, type PlanKey } from '@/lib/planConfig';

const getPlanMeta = (plan: string) => {
  const cfg = PLAN_CONFIG[plan as PlanKey];
  if (!cfg) return { label: plan, price: '—', color: 'text-foreground', badgeClass: '' };
  const price = cfg.monthlyPrice === null ? 'Custom' : cfg.monthlyPrice === 0 ? '$0' : `$${cfg.monthlyPrice}/mo`;
  return { label: cfg.label, price, color: cfg.color, badgeClass: cfg.badgeClass };
};

export function AdminPlansTab() {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.plans;

  const { data: planLimits = [] } = useQuery({
    queryKey: ['admin-plan-limits'],
    queryFn: async () => {
      const { data } = await supabase.from('plan_limits').select('*');
      return data || [];
    },
  });

  const { data: userCounts = {} } = useQuery({
    queryKey: ['admin-plan-user-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_plan');
      if (!data) return {};
      const counts: Record<string, number> = {};
      data.forEach((p: any) => { counts[p.user_plan] = (counts[p.user_plan] || 0) + 1; });
      return counts;
    },
  });

  const totalUsers = Object.values(userCounts).reduce((a: number, b: number) => a + b, 0);
  const order = ['plan_free', 'plan_plus', 'plan_pro', 'plan_business', 'plan_custom'];
  const sorted = [...planLimits].sort((a: any, b: any) => order.indexOf(a.plan) - order.indexOf(b.plan));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorted.map((pl: any) => {
        const meta = getPlanMeta(pl.plan);
        const count = (userCounts as any)[pl.plan] || 0;
        const pct = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0';

        return (
          <Card key={pl.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 ${meta.color === 'text-muted-foreground' ? 'bg-muted-foreground/30' : ''}`}
              style={{ background: meta.color !== 'text-muted-foreground' ? `var(--${meta.color.replace('text-', '')}, hsl(var(--primary)))` : undefined }} />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className={`h-5 w-5 ${meta.color}`} />
                  <CardTitle className="text-lg">{meta.label}</CardTitle>
                </div>
                <Badge className={meta.badgeClass} variant="secondary">{meta.price}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{count} {t?.activeUsers || 'active users'}</span>
                <span className="text-xs text-muted-foreground ml-auto">({pct}%)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-muted-foreground">{t?.workspaces || 'Workspaces'}</span>
                  <span className="ml-auto font-medium">{pl.max_workspaces}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-muted-foreground">{t?.projects || 'Projects'}</span>
                  <span className="ml-auto font-medium">{pl.max_projects_per_workspace}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-muted-foreground">{t?.members || 'Members'}</span>
                  <span className="ml-auto font-medium">{pl.max_members_per_workspace}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-muted-foreground">{t?.storage || 'Storage'}</span>
                  <span className="ml-auto font-medium">{pl.max_storage_mb >= 1024 ? `${(pl.max_storage_mb / 1024).toFixed(0)} GB` : `${pl.max_storage_mb} MB`}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                <div className="flex justify-between">
                  <span>{t?.maxFileSize || 'Max file size'}</span>
                  <span>{pl.max_file_size_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>{t?.exportData || 'Export data'}</span>
                  <span>{pl.can_export_data ? '✓' : '✗'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
