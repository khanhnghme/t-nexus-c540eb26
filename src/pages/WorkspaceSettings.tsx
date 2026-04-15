import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceBilling, formatPlanName } from '@/hooks/useWorkspaceBilling';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Save, Trash2, AlertTriangle, Crown, Copy, Check,
  Users, FolderKanban, HardDrive, LayoutGrid, Settings2, Zap, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useReadOnlyGuard } from '@/components/ReadOnlyGuard';

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${colorMap[color] || colorMap.primary}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function formatStorageSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export default function WorkspaceSettings() {
  const { activeWorkspace, workspaceRole, refreshWorkspaces, isAvailable } = useWorkspace();
  const { user } = useAuth();
  const { members } = useWorkspaceMembers();
  const { ownerPlan, ownerName, ownerId, projectCount: accountProjectCount, maxProjects, isLoading: billingLoading } = useWorkspaceBilling();
  const { toast } = useToast();
  const { translations: { app: t } } = useLanguage();
  const tw = t.workspace;
  const tc = t.common;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [wsProjectCount, setWsProjectCount] = useState(0);
  const [wsStorageMb, setWsStorageMb] = useState(0);
  const [planLimits, setPlanLimits] = useState<{ maxMembers: number | null; maxStorage: number | null }>({ maxMembers: null, maxStorage: null });
  const [shareAiCredits, setShareAiCredits] = useState(false);
  const [isTogglingShare, setIsTogglingShare] = useState(false);

  const isOwner = workspaceRole === 'workspace:owner';
  const canEdit = isOwner || workspaceRole === 'workspace:admin';

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setDescription(activeWorkspace.description || '');
      setShareAiCredits((activeWorkspace as any).share_ai_credits === true);

      // Fetch WS-specific project count
      supabase.from('groups').select('id', { count: 'exact', head: true })
        .eq('workspace_id', activeWorkspace.id)
        .then(({ count }) => setWsProjectCount(count || 0));

      // Fetch real storage usage for this WS
      supabase.rpc('get_workspace_storage_usage', { _workspace_id: activeWorkspace.id })
        .then(({ data }) => setWsStorageMb(typeof data === 'number' ? data : 0));
    }
  }, [activeWorkspace]);

  // Fetch account-wide limits from plan_limits
  useEffect(() => {
    if (ownerPlan) {
      supabase.from('plan_limits')
        .select('max_members_per_workspace, max_storage_mb')
        .eq('plan', ownerPlan as any)
        .maybeSingle()
        .then(({ data }) => {
          setPlanLimits({
            maxMembers: data?.max_members_per_workspace ?? null,
            maxStorage: data?.max_storage_mb ?? null,
          });
        });
    }
  }, [ownerPlan]);

  const { guardAction: guardReadOnly } = useReadOnlyGuard();

  if (!isAvailable || !activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Building2 className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">{tw.notAvailable}</p>
        <p className="text-sm">{tw.notAvailableDesc}</p>
      </div>
    );
  }

  const memberCount = (members?.length || 0) + 1;
  const planLabel = formatPlanName(ownerPlan);
  const isPremium = ownerPlan && ownerPlan !== 'plan_free';
  const isWsOwner = user?.id === ownerId;

  const handleSave = async () => {
    if (guardReadOnly()) return;
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('workspace-management', {
        body: { action: 'update_workspace', workspace_id: activeWorkspace.id, name: name.trim(), description: description.trim() || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refreshWorkspaces();
      toast({ title: tc.saved, description: tw.settingsUpdated });
    } catch (err: any) {
      toast({ title: tc.error, description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('workspace-management', {
        body: { action: 'delete_workspace', workspace_id: activeWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refreshWorkspaces();
      toast({ title: tc.deleted, description: tw.wsDeleted });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: tc.error, description: err.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const copySlug = () => {
    navigator.clipboard.writeText(activeWorkspace.slug);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const deleteNameMatches = deleteConfirmName.trim() === 'đồng ý' || deleteConfirmName.trim() === 'agree';

  // Build subtitle strings
  const locale = t === (t as any) ? 'en' : 'en'; // fallback
  const isVi = tw.title === 'Tổng quan Workspace';
  const memberSub = planLimits.maxMembers
    ? (isVi ? `Tổng tài khoản: ${planLimits.maxMembers} suất` : `Account pool: ${planLimits.maxMembers} seats`)
    : undefined;
  const projectSub = maxProjects
    ? (isVi ? `${accountProjectCount} / ${maxProjects} tổng tài khoản` : `${accountProjectCount} / ${maxProjects} account-wide`)
    : undefined;
  const storageSub = planLimits.maxStorage
    ? (isVi ? `Tổng tài khoản: ${formatStorageSize(planLimits.maxStorage)}` : `Account pool: ${formatStorageSize(planLimits.maxStorage)}`)
    : undefined;

  const planDetails = maxProjects && planLimits.maxMembers && planLimits.maxStorage
    ? (isVi
      ? `${maxProjects} dự án · ${planLimits.maxMembers} suất thành viên · ${formatStorageSize(planLimits.maxStorage)}`
      : `${maxProjects} projects · ${planLimits.maxMembers} seats · ${formatStorageSize(planLimits.maxStorage)}`)
    : '';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-primary" />
          {tw.title}
        </h1>
        <p className="text-muted-foreground mt-1">{tw.subtitle}</p>
      </div>

      {/* Stats Overview — real data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={tw.members} value={memberCount} sub={memberSub} color="blue" />
        <StatCard icon={FolderKanban} label={tw.projects} value={wsProjectCount} sub={projectSub} color="green" />
        <StatCard icon={HardDrive} label={tw.storage} value={formatStorageSize(wsStorageMb)} sub={storageSub} color="amber" />
        <StatCard icon={Crown} label={tw.plan} value={planLabel} sub={isPremium ? '✨ Premium' : undefined} color="primary" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="info" className="gap-1.5"><Building2 className="w-4 h-4" />{tw.infoTab}</TabsTrigger>
          <TabsTrigger value="plan" className="gap-1.5"><Crown className="w-4 h-4" />{tw.planTab}</TabsTrigger>
          {isOwner && <TabsTrigger value="danger" className="gap-1.5 text-destructive"><AlertTriangle className="w-4 h-4" />{tw.dangerTab}</TabsTrigger>}
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-heading font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-muted-foreground" />{tw.generalInfo}</h2>

              <div className="space-y-2">
                <Label htmlFor="ws-name">{tw.workspaceName}</Label>
                <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tw.workspaceNamePlaceholder} disabled={!canEdit} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ws-desc">{tw.description}</Label>
                <Textarea id="ws-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tw.descriptionPlaceholder} rows={3} disabled={!canEdit} />
              </div>

              <div className="space-y-2">
                <Label>{tw.slugUrl}</Label>
                <div className="flex items-center gap-2">
                  <Input value={activeWorkspace.slug} disabled className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copySlug}>
                    {copiedSlug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {canEdit && (
                <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? tc.saving : tw.saveChanges}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* AI Credit Sharing — only for owner and Pro+ plans */}
          {isOwner && isPremium && (
            <Card className="mt-4">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                  {tw.shareAiCredits}
                </h2>
                <p className="text-sm text-muted-foreground">{tw.shareAiCreditsDesc}</p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={shareAiCredits}
                    onCheckedChange={handleToggleShareCredits}
                    disabled={isTogglingShare}
                  />
                  <span className="text-sm font-medium">
                    {shareAiCredits ? tw.sharedPool : tw.personalCredit}
                  </span>
                </div>
                {shareAiCredits && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg p-3">
                    ⚠️ {tw.shareAiCreditsWarning}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plan Tab — owner's real plan */}
        <TabsContent value="plan" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">{tw.planSection}</h2>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${isPremium ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                  <Crown className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{planLabel} Plan</div>
                  {planDetails && (
                    <div className="text-sm text-muted-foreground">{planDetails}</div>
                  )}
                  {!isWsOwner && ownerName && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {isVi ? `Tài trợ bởi: ${ownerName}` : `Sponsored by: ${ownerName}`}
                    </div>
                  )}
                </div>
                {isWsOwner && !isPremium && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/upgrade')}>
                    <Zap className="w-3 h-3 mr-1" />
                    {tc.upgrade}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        {isOwner && (
          <TabsContent value="danger" className="mt-4">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {tw.dangerZone}
                </h2>
                <p className="text-sm text-muted-foreground">{tw.dangerDesc}</p>
                <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmName(''); }}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {tw.deleteWorkspace}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{tw.deleteConfirmTitle.replace('{name}', activeWorkspace.name)}</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3">
                          <p>{tw.deleteConfirmDesc}</p>
                          <div className="space-y-2">
                            <Label className="text-foreground font-medium">
                              {tw.deleteConfirmLabel}
                            </Label>
                            <Input
                              value={deleteConfirmName}
                              onChange={(e) => setDeleteConfirmName(e.target.value)}
                              placeholder={isVi ? 'đồng ý' : 'agree'}
                              className="border-destructive/50 focus-visible:ring-destructive font-mono"
                            />
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc.cancel}</AlertDialogCancel>
                      <Button
                        onClick={handleDelete}
                        disabled={!deleteNameMatches || isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                      >
                        {isDeleting ? tc.deleting : tw.deletePermanently}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
