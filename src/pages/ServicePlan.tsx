import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccountLimitsCheck } from '@/hooks/useAccountLimitsCheck';
import { AccountCleanupPanel } from '@/components/cleanup/AccountCleanupPanel';
import { supabase } from '@/integrations/supabase/client';
import { formatPlanName } from '@/hooks/useWorkspaceBilling';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Crown, Zap, Building2, FolderKanban, HardDrive,
  ArrowRight, Loader2, Infinity, Receipt, ArrowLeft,
  Check, Users, Shield, Sparkles, BarChart3,
} from 'lucide-react';

interface WorkspaceUsage {
  id: string;
  name: string;
  plan: string;
  projectCount: number;
  maxProjects: number | null;
  storageMb: number;
  maxStorageMb: number;
  memberCount: number;
  maxMembers: number | null;
}

interface PlanLimitsData {
  max_workspaces: number;
  max_projects_per_workspace: number;
  max_members_per_workspace: number;
  max_storage_mb: number;
}

const MOCK_BILLING = [
  { id: 'TXN-20260301-001', date: '01/03/2026', plan: 'Pro', amount: '$12.00', status: 'Paid' },
  { id: 'TXN-20260201-001', date: '01/02/2026', plan: 'Pro', amount: '$12.00', status: 'Paid' },
  { id: 'TXN-20260115-002', date: '15/01/2026', plan: 'Pro (Upgrade)', amount: '$7.20', status: 'Paid' },
  { id: 'TXN-20260101-001', date: '01/01/2026', plan: 'Plus', amount: '$4.80', status: 'Paid' },
  { id: 'TXN-20251201-001', date: '01/12/2025', plan: 'Free', amount: '$0.00', status: 'Free' },
];

export default function ServicePlan() {
  const { user, profile } = useAuth();
  const { workspaces } = useWorkspace();
  const { translations: { app: { servicePlan: t, servicePlanFullFeatures: featuresMap } } } = useLanguage();
  const accountLimits = useAccountLimitsCheck();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [wsUsages, setWsUsages] = useState<WorkspaceUsage[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimitsData | null>(null);
  const [uniqueMemberCount, setUniqueMemberCount] = useState(0);

  const currentTab = searchParams.get('tab') || 'plan';

  const plan = profile?.user_plan || 'plan_free';
  const planName = formatPlanName(plan);
  const isPremium = plan !== 'plan_free';
  const features = featuresMap[plan] || featuresMap.plan_free;

  useEffect(() => {
    if (!user) return;
    fetchUsages();
  }, [user, workspaces]);

  const fetchUsages = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const ownedWs = workspaces.filter(w => w.owner_id === user.id);
      if (ownedWs.length === 0) {
        setWsUsages([]);
        setIsLoading(false);
        return;
      }

      const wsIds = ownedWs.map(w => w.id);

      const [groupsRes, limitsRes, membersRes] = await Promise.all([
        supabase.from('groups').select('id, workspace_id').in('workspace_id', wsIds),
        supabase.from('plan_limits').select('*').eq('plan', plan as any).maybeSingle(),
        supabase.from('workspace_members').select('workspace_id, user_id').in('workspace_id', wsIds),
      ]);

      const projectCountMap: Record<string, number> = {};
      (groupsRes.data || []).forEach(g => {
        if (g.workspace_id) projectCountMap[g.workspace_id] = (projectCountMap[g.workspace_id] || 0) + 1;
      });

      const memberCountMap: Record<string, number> = {};
      const uniqueMemberIds = new Set<string>();
      (membersRes.data || []).forEach(m => {
        if (m.workspace_id) memberCountMap[m.workspace_id] = (memberCountMap[m.workspace_id] || 0) + 1;
        if (m.user_id) uniqueMemberIds.add(m.user_id);
      });

      const limits = limitsRes.data;
      const maxProjects = limits?.max_projects_per_workspace ?? null;
      const maxStorage = limits?.max_storage_mb ?? 500;
      const maxMembers = limits?.max_members_per_workspace ?? null;

      if (limits) {
        setPlanLimits({
          max_workspaces: limits.max_workspaces,
          max_projects_per_workspace: limits.max_projects_per_workspace,
          max_members_per_workspace: limits.max_members_per_workspace,
          max_storage_mb: limits.max_storage_mb,
        });
      }

      const storagePromises = ownedWs.map(async (ws) => {
        const { data } = await supabase.rpc('get_workspace_storage_usage', { _workspace_id: ws.id });
        return { wsId: ws.id, storageMb: Math.round(Number(data) || 0) };
      });
      const storageResults = await Promise.all(storagePromises);
      const storageMap: Record<string, number> = {};
      storageResults.forEach(r => { storageMap[r.wsId] = r.storageMb; });

      const usages: WorkspaceUsage[] = ownedWs.map(ws => ({
        id: ws.id,
        name: ws.name,
        plan: planName,
        projectCount: projectCountMap[ws.id] || 0,
        maxProjects,
        storageMb: storageMap[ws.id] || 0,
        maxStorageMb: maxStorage,
        memberCount: memberCountMap[ws.id] || 0,
        maxMembers,
      }));

      setWsUsages(usages);
      setUniqueMemberCount(uniqueMemberIds.size);
    } catch (err) {
      console.warn('Error fetching service plan data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalProjects = wsUsages.reduce((s, w) => s + w.projectCount, 0);
  const totalMembers = uniqueMemberCount;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            <span>{t.goBack}</span>
          </button>
          <h1 className="text-2xl font-heading font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Button
          onClick={() => navigate('/upgrade?from=personal')}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Zap className="w-4 h-4 mr-2" />
          {t.upgradePlan}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="plan">{t.currentPlanTab}</TabsTrigger>
          <TabsTrigger value="usage">{t.usageTab}</TabsTrigger>
          {accountLimits.isOverLimits && (
            <TabsTrigger value="cleanup" className="text-destructive data-[state=active]:text-destructive">
              {t.cleanupTab}
            </TabsTrigger>
          )}
          <TabsTrigger value="billing">{t.billingTab}</TabsTrigger>
        </TabsList>

        {/* TAB 1: Current plan */}
        <TabsContent value="plan" className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              {t.currentPlan}
            </h2>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3.5 rounded-2xl ${isPremium ? 'bg-amber-500/10' : 'bg-muted'}`}>
                      {isPremium ? (
                        <Crown className="w-8 h-8 text-amber-500" />
                      ) : (
                        <Zap className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl font-bold">{planName}</span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${isPremium
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : ''
                          }`}
                        >
                          {isPremium ? t.active : t.free}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {isPremium ? t.premiumDesc : t.freeDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6 md:gap-8">
                    <div className="text-center">
                      <div className="text-xl font-bold tabular-nums">{wsUsages.length}</div>
                      <div className="text-xs text-muted-foreground">{t.workspace}</div>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="text-center">
                      <div className="text-xl font-bold tabular-nums">{totalProjects}</div>
                      <div className="text-xs text-muted-foreground">{t.projects}</div>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="text-center">
                      <div className="text-xl font-bold tabular-nums">{totalMembers}</div>
                      <div className="text-xs text-muted-foreground">{t.members}</div>
                    </div>
                  </div>
                </div>

                <Separator className="my-5" />

                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {t.planBenefits.replace('{name}', planName)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {features.map((feature: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm py-1">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {!isPremium && (
            <section>
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10">
                    <Sparkles className="w-7 h-7 text-amber-500" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold">{t.unlockPremium}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{t.unlockPremiumDesc}</p>
                  </div>
                  <Button
                    onClick={() => navigate('/upgrade?from=personal')}
                    className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {t.upgradeNow}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}
        </TabsContent>

        {/* TAB 2: Usage */}
        <TabsContent value="usage" className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              {t.usageOverview}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs font-medium">{t.workspace}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">{wsUsages.length}</span>
                    <span className="text-sm text-muted-foreground">
                      / {planLimits?.max_workspaces ?? <Infinity className="w-3.5 h-3.5 inline" />}
                    </span>
                  </div>
                  {planLimits?.max_workspaces && (
                    <Progress value={Math.min(100, (wsUsages.length / planLimits.max_workspaces) * 100)} className="h-1.5" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FolderKanban className="w-4 h-4" />
                    <span className="text-xs font-medium">{t.projects}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">{totalProjects}</span>
                    <span className="text-sm text-muted-foreground">
                      / {planLimits?.max_projects_per_workspace
                        ? planLimits.max_projects_per_workspace
                        : <Infinity className="w-3.5 h-3.5 inline" />}
                    </span>
                  </div>
                  {planLimits?.max_projects_per_workspace && (
                    <Progress
                      value={Math.min(100, (totalProjects / planLimits.max_projects_per_workspace) * 100)}
                      className="h-1.5"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">{t.memberSeats}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">{totalMembers}</span>
                    <span className="text-sm text-muted-foreground">
                      / {planLimits?.max_members_per_workspace
                        ? planLimits.max_members_per_workspace
                        : <Infinity className="w-3.5 h-3.5 inline" />}
                    </span>
                  </div>
                  {planLimits?.max_members_per_workspace && (
                    <Progress
                      value={Math.min(100, (totalMembers / planLimits.max_members_per_workspace) * 100)}
                      className="h-1.5"
                    />
                  )}
                  <p className="text-[10px] text-muted-foreground">{t.memberSeatsNote}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-xs font-medium">{t.storage}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">
                      {wsUsages.reduce((s, w) => s + w.storageMb, 0)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      MB / {planLimits?.max_storage_mb
                        ? `${planLimits.max_storage_mb >= 1000 ? `${(planLimits.max_storage_mb / 1000).toFixed(0)} GB` : `${planLimits.max_storage_mb} MB`}`
                        : <Infinity className="w-3.5 h-3.5 inline" />}
                    </span>
                  </div>
                  {planLimits?.max_storage_mb && (
                    <Progress
                      value={Math.min(100, (wsUsages.reduce((s, w) => s + w.storageMb, 0) / planLimits.max_storage_mb) * 100)}
                      className="h-1.5"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Per-Workspace Breakdown */}
          <section className="space-y-4">
            <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              {t.detailByWorkspace}
            </h2>

            {wsUsages.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  {t.noWorkspaceOwned}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {wsUsages.map(ws => {
                  const totalProjectsAll = wsUsages.reduce((s, w) => s + w.projectCount, 0);
                  const totalStorageAll = wsUsages.reduce((s, w) => s + w.storageMb, 0);
                  const projectContribPct = totalProjectsAll > 0 ? Math.round((ws.projectCount / totalProjectsAll) * 100) : 0;
                  const storageContribPct = totalStorageAll > 0 ? Math.round((ws.storageMb / totalStorageAll) * 100) : 0;

                  const formatStorage = (mb: number) => mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`;

                  return (
                    <Card key={ws.id}>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {ws.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{ws.name}</h3>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <FolderKanban className="w-3 h-3" /> {t.projects}
                              </span>
                              <span className="font-medium tabular-nums">
                                {ws.projectCount} {t.projectsLabel}
                                <span className="text-muted-foreground ml-1">({projectContribPct}%)</span>
                              </span>
                            </div>
                            <Progress value={ws.maxProjects ? Math.min(100, (ws.projectCount / ws.maxProjects) * 100) : projectContribPct} className="h-1.5" />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <Users className="w-3 h-3" /> {t.members}
                              </span>
                              <span className="font-medium tabular-nums">
                                {ws.memberCount} {t.membersLabel}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <HardDrive className="w-3 h-3" /> {t.storage}
                              </span>
                              <span className="font-medium tabular-nums">
                                {formatStorage(ws.storageMb)}
                                <span className="text-muted-foreground ml-1">({storageContribPct}%)</span>
                              </span>
                            </div>
                            <Progress value={ws.maxStorageMb > 0 ? Math.min(100, (ws.storageMb / ws.maxStorageMb) * 100) : 0} className="h-1.5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {accountLimits.isOverLimits && (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={() => handleTabChange('cleanup')} className="text-destructive border-destructive/30">
                {t.openCleanupTool}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB: Cleanup */}
        {accountLimits.isOverLimits && (
          <TabsContent value="cleanup" className="space-y-6">
            <AccountCleanupPanel onCleanupComplete={fetchUsages} />
          </TabsContent>
        )}

        {/* TAB 3: Billing history */}
        <TabsContent value="billing" className="space-y-4">
          <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            {t.billingHistory}
          </h2>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{t.dateCol}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{t.txnCol}</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{t.planCol}</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{t.amountCol}</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{t.statusCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_BILLING.map(row => (
                    <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3 text-sm">{row.date}</td>
                      <td className="px-5 py-3 text-sm font-mono text-xs text-muted-foreground">{row.id}</td>
                      <td className="px-5 py-3 text-sm font-medium">{row.plan}</td>
                      <td className="px-5 py-3 text-sm text-right tabular-nums">{row.amount}</td>
                      <td className="px-5 py-3 text-right">
                        <Badge
                          variant={row.status === 'Paid' ? 'default' : 'secondary'}
                          className={`text-[10px] ${
                            row.status === 'Paid' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none' :
                            row.status === 'Free' ? 'bg-muted text-muted-foreground border-none' :
                            'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">{t.showingRecent}</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
