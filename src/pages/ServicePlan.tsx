import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Check, Users, Shield, Sparkles, BarChart3, Package, AlertTriangle, RefreshCw,
  Video, Minus, CalendarDays, CreditCard, ArrowDown, ArrowUp, Bot,
} from 'lucide-react';
import { getPlanLabel } from '@/lib/planConfig';
import { ConnectedToolsTailwind, shouldShowIntegrations } from '@/components/ConnectedToolsBadge';
import { UserPaymentDetailDialog } from '@/components/billing/UserPaymentDetailDialog';

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
  aiUsage: number;
}

interface PlanLimitsData {
  max_workspaces: number;
  max_projects_per_workspace: number;
  max_members_per_workspace: number;
  max_storage_mb: number;
}

// PaymentRecord now uses full payment_history columns
type PaymentRecord = any;

// Addon discount removed — now handled in AddonCheckout

export default function ServicePlan() {
  const { user, profile } = useAuth();
  const { workspaces } = useWorkspace();
  const { translations: { app: { servicePlan: t, servicePlanFullFeatures: featuresMap, servicePlanFeatureGroups: featureGroupsMap } } } = useLanguage();
  const accountLimits = useAccountLimitsCheck();
  const userAddons = useUserAddons();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [wsUsages, setWsUsages] = useState<WorkspaceUsage[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimitsData | null>(null);
  const [uniqueMemberCount, setUniqueMemberCount] = useState(0);
  const [aiUsage, setAiUsage] = useState(0);
  const [aiLimit, setAiLimit] = useState<number | null>(null);
  // billingHistory state removed — now in BillingHistory page

  // newAddons state removed — selection now in AddonCheckout

  // Billing history fetch removed — now in BillingHistory page

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

      const today = new Date().toISOString().slice(0, 10);
      const detailPromises = ownedWs.map(async (ws) => {
        const [storageRes, aiRes] = await Promise.all([
          supabase.rpc('get_workspace_storage_usage', { _workspace_id: ws.id }),
          supabase.rpc('get_workspace_ai_usage_today', { _workspace_id: ws.id, _date: today }),
        ]);
        return {
          wsId: ws.id,
          storageMb: Math.round(Number(storageRes.data) || 0),
          aiUsage: Number(aiRes.data) || 0,
        };
      });
      const detailResults = await Promise.all(detailPromises);
      const storageMap: Record<string, number> = {};
      const aiUsageMap: Record<string, number> = {};
      detailResults.forEach(r => {
        storageMap[r.wsId] = r.storageMb;
        aiUsageMap[r.wsId] = r.aiUsage;
      });

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
        aiUsage: aiUsageMap[ws.id] || 0,
      }));

      setWsUsages(usages);
      setUniqueMemberCount(uniqueMemberIds.size);

      // Fetch aggregate AI usage for the account summary card
      const [aiUsageRes, aiLimitRes] = await Promise.all([
        supabase.rpc('get_owner_ai_usage_today', { _owner_id: user.id, _date: today }),
        supabase.from('plan_limits').select('max_ai_messages_per_day').eq('plan', plan as any).maybeSingle(),
      ]);
      setAiUsage(Number(aiUsageRes.data) || 0);
      setAiLimit(aiLimitRes.data?.max_ai_messages_per_day ?? null);
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

  const currentTab = searchParams.get('tab') || 'plan';
  const plan = profile?.user_plan || 'plan_free';
  const planName = formatPlanName(plan);
  const isPremium = plan !== 'plan_free';
  const features = featuresMap[plan] || featuresMap.plan_free;

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
      bonusRaw: userAddons.getQuantity('projects') * 5,
      currentUsage: totalProjects,
    },
    {
      type: 'storage',
      label: t.addonStorage || 'Extra Storage',
      desc: t.addonStorageDesc || '+5 GB per package',
      icon: <HardDrive className="w-5 h-5" />,
      iconColor: 'text-orange-500',
      baseLimitRaw: planLimits?.max_storage_mb ?? null,
      bonusRaw: userAddons.getQuantity('storage') * 5 * 1024,
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
      bonusRaw: userAddons.getQuantity('members') * 5,
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
                      <div className="text-xl font-bold tabular-nums">
                        {wsUsages.length}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{accountLimits.maxWorkspaces ?? '∞'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{t.workspace}</div>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="text-center">
                      <div className="text-xl font-bold tabular-nums">
                        {totalProjects}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{accountLimits.maxProjects ?? '∞'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{t.projects}</div>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="text-center">
                      <div className="text-xl font-bold tabular-nums">
                        {totalMembers}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{accountLimits.maxMembers ?? '∞'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{t.members}</div>
                    </div>
                  </div>
                </div>

                {/* Subscription Details Card — only for premium */}
                {isPremium && (() => {
                  const startDate = profile?.plan_started_at ? new Date(profile.plan_started_at) : null;
                  const expiresDate = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
                  const now = new Date();
                  const daysUntilExpiry = expiresDate ? Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                  const billingLabel = profile?.billing_cycle === 'yearly' ? t.yearlyLabel : t.monthlyLabel;
                  const autoRenew = profile?.auto_renew;
                  const nextPlan = profile?.next_plan;
                  const planSource = profile?.plan_source || '—';
                  const isDowngrade = nextPlan && ['plan_free', 'plan_plus'].includes(nextPlan as string);

                  return (
                    <div className="mt-5">
                      <Separator className="mb-5" />
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        {t.subscriptionDetails}
                      </h3>
                      <Card className="border-border/50">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            <div className="flex items-center justify-between py-1.5 text-sm">
                              <span className="text-muted-foreground">{t.startedAt}</span>
                              <span className="font-medium">
                                {startDate ? startDate.toLocaleDateString() : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 text-sm">
                              <span className="text-muted-foreground">{t.expiresAt}</span>
                              <span className={`font-medium ${isExpiringSoon ? 'text-orange-500' : ''}`}>
                                {expiresDate ? expiresDate.toLocaleDateString() : t.noExpiration}
                                {isExpiringSoon && (
                                  <span className="ml-1.5 text-xs text-orange-500">({t.expiresWarning})</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 text-sm">
                              <span className="text-muted-foreground">{t.billingCycleLabel}</span>
                              <span className="font-medium flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                {billingLabel}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 text-sm">
                              <span className="text-muted-foreground">{t.autoRenewLabel}</span>
                              <span className={`font-medium flex items-center gap-1 ${autoRenew ? 'text-emerald-500' : 'text-orange-500'}`}>
                                {autoRenew ? (
                                  <><Check className="w-3.5 h-3.5" /> {t.autoRenewEnabled}</>
                                ) : (
                                  <><Minus className="w-3.5 h-3.5" /> {t.autoRenewDisabled}</>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 text-sm">
                              <span className="text-muted-foreground">{t.planSourceLabel}</span>
                              <span className="font-medium capitalize">{planSource}</span>
                            </div>
                          </div>

                          {/* Scheduled downgrade/upgrade warning */}
                          {nextPlan && (
                            <>
                              <Separator className="my-3" />
                              <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${
                                isDowngrade ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}>
                                {isDowngrade ? <ArrowDown className="w-4 h-4 shrink-0" /> : <ArrowUp className="w-4 h-4 shrink-0" />}
                                <div>
                                  <span className="font-medium">
                                    {isDowngrade ? t.scheduledDowngrade : t.scheduledUpgrade}:
                                  </span>{' '}
                                  {getPlanLabel(nextPlan)}
                                  {expiresDate && (
                                    <span className="text-muted-foreground"> — {expiresDate.toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Will not auto-renew warning */}
                          {!autoRenew && !nextPlan && (
                            <>
                              <Separator className="my-3" />
                              <div className="flex items-center gap-2 p-2.5 rounded-lg text-sm bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{t.willNotRenew}</span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                <Separator className="my-5" />

                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {t.planBenefits.replace('{name}', planName)}
                  </h3>
                  {(() => {
                    const iconMap: Record<string, React.ElementType> = {
                      building: Building2, folder: FolderKanban, video: Video,
                      sparkles: Sparkles, headset: Shield,
                    };
                    const featureGroups = (featureGroupsMap as any)?.[plan] || [];
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {featureGroups.map((group: any, gi: number) => {
                          const IconComp = iconMap[group.icon] || Sparkles;
                          return (
                            <Card key={gi} className="border-border/50">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <IconComp className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-semibold">{group.category}</span>
                                </div>
                                <div className="space-y-0">
                                  {group.items.map((item: any, ii: number) => (
                                    <div key={ii}>
                                      <div className="flex items-center justify-between py-1.5 text-sm">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        {item.value === '✓' ? (
                                          <Check className="w-4 h-4 text-emerald-500" />
                                        ) : item.value === '—' ? (
                                          <Minus className="w-4 h-4 text-muted-foreground/50" />
                                        ) : (
                                          <span className="font-medium">{item.value}</span>
                                        )}
                                      </div>
                                      {ii < group.items.length - 1 && <Separator />}
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {shouldShowIntegrations(plan) && (
                    <div className="mt-4">
                      <ConnectedToolsTailwind />
                    </div>
                  )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  {
                    label: t.aiMessages,
                    icon: <Bot className="w-4 h-4" />,
                    current: aiUsage,
                    max: aiLimit,
                    baseMax: aiLimit,
                    bonus: 0,
                    suffix: '/day',
                    iconColor: 'text-purple-500',
                    note: t.aiMessagesNote,
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
                {/* Section 1: Current Add-ons Overview */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    {t.addonCurrentTitle || 'Current Add-ons'}
                  </h3>

                  {addonCards.every(c => userAddons.getQuantity(c.type) === 0) ? (
                    <Card className="border-dashed">
                      <CardContent className="p-5 text-center text-sm text-muted-foreground">
                        {t.addonNoneYet || 'No add-on packages purchased yet.'}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-3">
                      {addonCards.filter(c => userAddons.getQuantity(c.type) > 0).map(card => {
                        const ownedQty = userAddons.getQuantity(card.type);
                        const totalLimit = card.baseLimitRaw !== null ? card.baseLimitRaw + card.bonusRaw : null;
                        const pct = totalLimit !== null && totalLimit > 0 ? (card.currentUsage / totalLimit) * 100 : 0;
                        const isOver = totalLimit !== null && card.currentUsage >= totalLimit;
                        const isWarning = !isOver && totalLimit !== null && pct >= 80;

                        return (
                          <Card key={card.type} className={isOver ? 'border-destructive/30 bg-destructive/5' : ''}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-muted ${isOver ? 'text-destructive' : card.iconColor}`}>
                                  {card.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm">{card.label}</span>
                                    <Badge variant="secondary" className="text-xs">{ownedQty} {t.addonPackage || 'pkg'}</Badge>
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{t.addonBase || 'Base'}: {card.baseLimitRaw !== null ? (card.formatVal ? card.formatVal(card.baseLimitRaw) : card.baseLimitRaw) : '∞'}</span>
                                    <span>+</span>
                                    <span className="text-violet-600 dark:text-violet-400 font-medium">
                                      {t.addonBonus || 'Add-on'}: +{card.formatVal ? card.formatVal(card.bonusRaw) : card.bonusRaw}
                                    </span>
                                    <span>=</span>
                                    <span className="font-bold text-foreground">{totalLimit !== null ? (card.formatVal ? card.formatVal(totalLimit) : totalLimit) : '∞'}</span>
                                  </div>
                                  {totalLimit !== null && (
                                    <div className="mt-1.5">
                                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                                        <span>{card.currentUsage} {card.suffix || ''} used</span>
                                        <span>{card.formatVal ? card.formatVal(totalLimit) : totalLimit}</span>
                                      </div>
                                      <Progress
                                        value={Math.min(100, pct)}
                                        className={`h-1.5 ${isOver ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-amber-500' : ''}`}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Buy more button */}
                <div className="text-center pt-2">
                  <Button
                    onClick={() => navigate('/addon-checkout')}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    {t.addonBuyMore || 'Buy more Add-on packages'}
                  </Button>
                </div>
              </>
            )}
          </section>
        </TabsContent>

        {/* TAB: Cleanup */}
        <TabsContent value="cleanup" className="space-y-6">
          <AccountCleanupPanel onCleanupComplete={fetchUsages} />
        </TabsContent>

        {/* Billing tab removed — now at /billing-history */}
      </Tabs>
    </div>
  );
}
