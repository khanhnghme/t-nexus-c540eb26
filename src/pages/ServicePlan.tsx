import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccountLimitsCheck } from '@/hooks/useAccountLimitsCheck';
import { useUserAddons, AddonType } from '@/hooks/useUserAddons';
import { AccountCleanupPanel } from '@/components/cleanup/AccountCleanupPanel';
import { supabase } from '@/integrations/supabase/client';
import { formatPlanName } from '@/hooks/useWorkspaceBilling';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Crown, Zap, Building2, FolderKanban, HardDrive,
  ArrowRight, Loader2, Infinity, Receipt,
  Check, Users, Shield, Sparkles, BarChart3,
  Plus, Minus, Package, AlertTriangle, ShieldCheck,
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

interface PaymentRecord {
  id: string;
  transaction_id: string | null;
  created_at: string;
  plan_purchased: string;
  amount: number;
  final_amount: number | null;
  status: string;
  payment_method: string | null;
}

const BASE_PRICE = 2.49;

function getAddonDiscount(plan: string): { pct: number; label: string } {
  if (plan === 'plan_pro') return { pct: 0.10, label: '-10% Pro' };
  if (plan === 'plan_business') return { pct: 0.20, label: '-20% Business' };
  return { pct: 0, label: '' };
}

export default function ServicePlan() {
  const { user, profile } = useAuth();
  const { workspaces } = useWorkspace();
  const { translations: { app: { servicePlan: t, servicePlanFullFeatures: featuresMap } } } = useLanguage();
  const accountLimits = useAccountLimitsCheck();
  const userAddons = useUserAddons();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [wsUsages, setWsUsages] = useState<WorkspaceUsage[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimitsData | null>(null);
  const [uniqueMemberCount, setUniqueMemberCount] = useState(0);
  const [billingHistory, setBillingHistory] = useState<PaymentRecord[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);

  // Local addon quantities for editing
  const [localAddons, setLocalAddons] = useState<Record<AddonType, number>>({
    projects: 0,
    storage: 0,
    members: 0,
  });
  const [addonDirty, setAddonDirty] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [addonPaymentLoading, setAddonPaymentLoading] = useState(false);
  const [showAddonPaypal, setShowAddonPaypal] = useState(false);

  const currentTab = searchParams.get('tab') || 'plan';

  const plan = profile?.user_plan || 'plan_free';
  const planName = formatPlanName(plan);
  const isPremium = plan !== 'plan_free';
  const features = featuresMap[plan] || featuresMap.plan_free;

  // Sync local addons from DB
  useEffect(() => {
    if (!userAddons.isLoading) {
      setLocalAddons({
        projects: userAddons.getQuantity('projects'),
        storage: userAddons.getQuantity('storage'),
        members: userAddons.getQuantity('members'),
      });
      setAddonDirty(false);
    }
  }, [userAddons.isLoading, userAddons.addons]);

  // Fetch billing history
  useEffect(() => {
    if (!user) return;
    setBillingLoading(true);
    supabase
      .from('payment_history')
      .select('id, transaction_id, created_at, plan_purchased, amount, final_amount, status, payment_method')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setBillingHistory((data as PaymentRecord[]) || []);
        setBillingLoading(false);
      });
  }, [user]);

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

  const handleAddonChange = (type: AddonType, delta: number) => {
    setLocalAddons(prev => {
      const newVal = Math.max(0, (prev[type] || 0) + delta);
      return { ...prev, [type]: newVal };
    });
    setAddonDirty(true);
  };

  const handleAddonConfirm = async () => {
    for (const type of ['projects', 'storage', 'members'] as AddonType[]) {
      await userAddons.updateAddon(type, localAddons[type]);
    }
    setAddonDirty(false);
    accountLimits.refresh();
    toast({
      title: '🧩 Add-on',
      description: t.addonComingSoon || 'Payment for add-ons is coming soon.',
    });
  };

  const discount = getAddonDiscount(plan);
  const unitPrice = BASE_PRICE * (1 - discount.pct);
  const totalAddonQty = localAddons.projects + localAddons.storage + localAddons.members;
  const totalAddonCost = totalAddonQty * unitPrice;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Addon card config
  const addonCards: {
    type: AddonType;
    label: string;
    desc: string;
    icon: React.ReactNode;
    iconColor: string;
    baseLimitRaw: number | null;
    bonusRaw: number;
    currentUsage: number;
    suffix?: string;
    formatVal?: (v: number) => string;
  }[] = [
    {
      type: 'projects',
      label: t.addonProjects || 'Extra Projects',
      desc: t.addonProjectsDesc || '+5 projects per package',
      icon: <FolderKanban className="w-5 h-5" />,
      iconColor: 'text-violet-500',
      baseLimitRaw: planLimits?.max_projects_per_workspace ?? null,
      bonusRaw: localAddons.projects * 5,
      currentUsage: totalProjects,
    },
    {
      type: 'storage',
      label: t.addonStorage || 'Extra Storage',
      desc: t.addonStorageDesc || '+5 GB per package',
      icon: <HardDrive className="w-5 h-5" />,
      iconColor: 'text-orange-500',
      baseLimitRaw: planLimits?.max_storage_mb ?? null,
      bonusRaw: localAddons.storage * 5 * 1024,
      currentUsage: wsUsages.reduce((s, w) => s + w.storageMb, 0),
      suffix: 'MB',
      formatVal: (v: number) => v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${v} MB`,
    },
    {
      type: 'members',
      label: t.addonMembers || 'Extra Member Seats',
      desc: t.addonMembersDesc || '+5 member seats per package',
      icon: <Users className="w-5 h-5" />,
      iconColor: 'text-emerald-500',
      baseLimitRaw: planLimits?.max_members_per_workspace ?? null,
      bonusRaw: localAddons.members * 5,
      currentUsage: totalMembers,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
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
          <TabsTrigger value="addon">{t.addonTab || '🧩 Add-ons'}</TabsTrigger>
          <TabsTrigger value="cleanup">{t.cleanupTab}</TabsTrigger>
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
              {(() => {
                const totalStorage = wsUsages.reduce((s, w) => s + w.storageMb, 0);

                const usageCards: {
                  label: string;
                  icon: React.ReactNode;
                  current: number;
                  max: number | null;
                  baseMax: number | null;
                  bonus: number;
                  suffix?: string;
                  note?: string;
                  iconColor: string;
                  formatMax?: (v: number) => string;
                }[] = [
                  {
                    label: t.workspace,
                    icon: <Building2 className="w-4 h-4" />,
                    current: wsUsages.length,
                    max: accountLimits.maxWorkspaces,
                    baseMax: accountLimits.maxWorkspaces,
                    bonus: 0,
                    iconColor: 'text-blue-500',
                  },
                  {
                    label: t.projects,
                    icon: <FolderKanban className="w-4 h-4" />,
                    current: totalProjects,
                    max: accountLimits.maxProjects,
                    baseMax: accountLimits.baseProjects,
                    bonus: accountLimits.bonusProjects,
                    iconColor: 'text-violet-500',
                  },
                  {
                    label: t.memberSeats,
                    icon: <Users className="w-4 h-4" />,
                    current: totalMembers,
                    max: accountLimits.maxMembers,
                    baseMax: accountLimits.baseMembers,
                    bonus: accountLimits.bonusMembers,
                    iconColor: 'text-emerald-500',
                    note: t.memberSeatsNote,
                  },
                  {
                    label: t.storage,
                    icon: <HardDrive className="w-4 h-4" />,
                    current: totalStorage,
                    max: accountLimits.maxStorageMb,
                    baseMax: accountLimits.baseStorageMb,
                    bonus: accountLimits.bonusStorageMb,
                    suffix: 'MB',
                    iconColor: 'text-orange-500',
                    formatMax: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)} GB` : `${v} MB`,
                  },
                ];

                return usageCards.map((card, idx) => {
                  const isOver = card.max !== null && card.current >= card.max;
                  const pct = card.max !== null && card.max > 0 ? (card.current / card.max) * 100 : 0;
                  const isWarning = !isOver && card.max !== null && pct >= 80;

                  return (
                    <Card key={idx} className={isOver ? 'border-red-500/30 bg-red-500/5' : ''}>
                      <CardContent className="p-4 space-y-2">
                        <div className={`flex items-center gap-2 ${isOver ? 'text-red-600 dark:text-red-400' : card.iconColor}`}>
                          {card.icon}
                          <span className="text-xs font-medium">{card.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-bold tabular-nums ${isOver ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {card.current}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {card.suffix ? ` ${card.suffix}` : ''} / {card.max !== null
                              ? (card.formatMax ? card.formatMax(card.max) : card.max)
                              : <Infinity className="w-3.5 h-3.5 inline" />}
                          </span>
                        </div>
                        {/* Show base + addon breakdown if bonus > 0 */}
                        {card.bonus > 0 && card.baseMax !== null && (
                          <p className="text-[10px] text-muted-foreground">
                            {card.formatMax ? card.formatMax(card.baseMax) : card.baseMax} ({t.addonBase || 'Base'}) + {card.formatMax ? card.formatMax(card.bonus) : card.bonus} ({t.addonBonus || 'Add-on'})
                          </p>
                        )}
                        {card.max !== null && (
                          <Progress
                            value={Math.min(100, pct)}
                            className={`h-1.5 ${isOver ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-amber-500' : ''}`}
                          />
                        )}
                        {card.note && <p className="text-[10px] text-muted-foreground">{card.note}</p>}
                      </CardContent>
                    </Card>
                  );
                });
              })()}
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

                  const projPct = ws.maxProjects ? (ws.projectCount / ws.maxProjects) * 100 : 0;
                  const projOver = ws.maxProjects !== null && ws.projectCount >= ws.maxProjects;
                  const projWarn = !projOver && ws.maxProjects !== null && projPct >= 80;

                  const storagePct = ws.maxStorageMb > 0 ? (ws.storageMb / ws.maxStorageMb) * 100 : 0;
                  const storageOver = ws.maxStorageMb > 0 && ws.storageMb >= ws.maxStorageMb;
                  const storageWarn = !storageOver && ws.maxStorageMb > 0 && storagePct >= 80;

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
                              <span className={`flex items-center gap-1.5 ${projOver ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                <FolderKanban className="w-3 h-3" /> {t.projects}
                              </span>
                              <span className={`font-medium tabular-nums ${projOver ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {ws.projectCount} {t.projectsLabel}
                                <span className="text-muted-foreground ml-1">({projectContribPct}%)</span>
                              </span>
                            </div>
                            <Progress
                              value={ws.maxProjects ? Math.min(100, projPct) : projectContribPct}
                              className={`h-1.5 ${projOver ? '[&>div]:bg-red-500' : projWarn ? '[&>div]:bg-amber-500' : ''}`}
                            />
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
                              <span className={`flex items-center gap-1.5 ${storageOver ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                <HardDrive className="w-3 h-3" /> {t.storage}
                              </span>
                              <span className={`font-medium tabular-nums ${storageOver ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {formatStorage(ws.storageMb)}
                                <span className="text-muted-foreground ml-1">({storageContribPct}%)</span>
                              </span>
                            </div>
                            <Progress
                              value={ws.maxStorageMb > 0 ? Math.min(100, storagePct) : 0}
                              className={`h-1.5 ${storageOver ? '[&>div]:bg-red-500' : storageWarn ? '[&>div]:bg-amber-500' : ''}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <div className="text-center">
            <Button variant="outline" size="sm" onClick={() => handleTabChange('cleanup')}>
              {t.openCleanupTool}
            </Button>
          </div>
        </TabsContent>

        {/* TAB: Add-on */}
        <TabsContent value="addon" className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-500" />
              {t.addonTitle || 'Add-on Packages'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.addonDesc || 'Expand your resource limits with additional packages.'}
            </p>

            {!isPremium ? (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-sm">{t.addonFreeNotice || 'Add-ons require Plus plan or above.'}</h3>
                  </div>
                  <Button
                    onClick={() => navigate('/upgrade?from=personal')}
                    className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                    size="sm"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    {t.addonUpgradeBtn || 'Upgrade to use Add-ons'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {addonCards.map(card => {
                    const qty = localAddons[card.type];
                    const totalLimit = card.baseLimitRaw !== null ? card.baseLimitRaw + card.bonusRaw : null;
                    const pct = totalLimit !== null && totalLimit > 0 ? (card.currentUsage / totalLimit) * 100 : 0;
                    const isOver = totalLimit !== null && card.currentUsage >= totalLimit;
                    const isWarning = !isOver && totalLimit !== null && pct >= 80;
                    const costForThis = qty * unitPrice;

                    return (
                      <Card key={card.type} className={isOver ? 'border-red-500/30 bg-red-500/5' : ''}>
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Left: Icon + info */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`p-2.5 rounded-xl bg-muted ${isOver ? 'text-red-500' : card.iconColor}`}>
                                {card.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{card.label}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>

                                {/* Capacity breakdown */}
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">
                                    {t.addonBase || 'Base'}: <span className="font-medium text-foreground">{card.baseLimitRaw !== null ? (card.formatVal ? card.formatVal(card.baseLimitRaw) : card.baseLimitRaw) : '∞'}</span>
                                  </span>
                                  {card.bonusRaw > 0 && (
                                    <>
                                      <span className="text-muted-foreground">+</span>
                                      <span className="text-violet-600 dark:text-violet-400 font-medium">
                                        {t.addonBonus || 'Add-on'}: +{card.formatVal ? card.formatVal(card.bonusRaw) : card.bonusRaw}
                                      </span>
                                    </>
                                  )}
                                  <span className="text-muted-foreground">=</span>
                                  <span className={`font-bold ${isOver ? 'text-red-600 dark:text-red-400' : ''}`}>
                                    {totalLimit !== null ? (card.formatVal ? card.formatVal(totalLimit) : totalLimit) : '∞'}
                                  </span>
                                </div>

                                {/* Progress */}
                                {totalLimit !== null && (
                                  <div className="mt-2">
                                    <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                                      <span>{card.currentUsage} {card.suffix || ''} used</span>
                                      <span>{card.formatVal ? card.formatVal(totalLimit) : totalLimit}</span>
                                    </div>
                                    <Progress
                                      value={Math.min(100, pct)}
                                      className={`h-1.5 ${isOver ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-amber-500' : ''}`}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: Quantity controls */}
                            <div className="flex items-center gap-3 shrink-0">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => handleAddonChange(card.type, -1)}
                                disabled={qty <= 0}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </Button>
                              <div className="text-center min-w-[3rem]">
                                <div className="text-lg font-bold tabular-nums">{qty}</div>
                                <div className="text-[10px] text-muted-foreground">{t.addonPackage || 'pkg'}</div>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => handleAddonChange(card.type, 1)}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                              <div className="text-right min-w-[4.5rem]">
                                <div className="text-sm font-semibold tabular-nums">
                                  ${costForThis.toFixed(2)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{t.addonPerMonth || '/month'}</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Total cost + confirm */}
                <Card className="bg-muted/50">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <span className="text-sm font-medium">{t.addonTotalCost || 'Total add-on cost'}:</span>
                        <span className="text-2xl font-bold tabular-nums ml-3">
                          ${totalAddonCost.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">{t.addonPerMonth || '/month'}</span>
                      </div>
                      <Button
                        onClick={handleAddonConfirm}
                        disabled={!addonDirty}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        {t.addonConfirm || 'Confirm Changes'}
                      </Button>
                    </div>
                    {discount.pct > 0 && totalAddonQty > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600 pt-1 border-t">
                        <span>{t.addonSavings || 'Add-on savings'} ({discount.pct * 100}%)</span>
                        <span>-${(totalAddonQty * BASE_PRICE * discount.pct).toFixed(2)}/{t.addonPerMonth || 'month'}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </section>
        </TabsContent>

        {/* TAB: Cleanup */}
        <TabsContent value="cleanup" className="space-y-6">
          <AccountCleanupPanel onCleanupComplete={fetchUsages} />
        </TabsContent>

        {/* TAB: Billing history */}
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
                  {billingLoading ? (
                    <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                  ) : billingHistory.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">{t.noTransactions || 'No transactions yet'}</td></tr>
                  ) : billingHistory.map(row => {
                    const date = new Date(row.created_at);
                    const formattedDate = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
                    const displayAmount = row.final_amount ?? row.amount;
                    const statusLabel = row.status === 'completed' ? 'Paid' : row.status === 'pending' ? 'Pending' : row.status;
                    return (
                      <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-5 py-3 text-sm">{formattedDate}</td>
                        <td className="px-5 py-3 text-sm font-mono text-xs text-muted-foreground">{row.transaction_id || row.id.slice(0,13)}</td>
                        <td className="px-5 py-3 text-sm font-medium">{formatPlanName(row.plan_purchased)}</td>
                        <td className="px-5 py-3 text-sm text-right tabular-nums">${displayAmount.toFixed(2)}</td>
                        <td className="px-5 py-3 text-right">
                          <Badge
                            variant={statusLabel === 'Paid' ? 'default' : 'secondary'}
                            className={`text-[10px] ${
                              statusLabel === 'Paid' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none' :
                              statusLabel === 'Pending' ? 'bg-amber-500/15 text-amber-600 border-none' :
                              'bg-muted text-muted-foreground border-none'
                            }`}
                          >
                            {statusLabel}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
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
