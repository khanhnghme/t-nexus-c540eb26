import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import DashboardProjectCard from '@/components/dashboard/DashboardProjectCard';
import { supabase } from '@/integrations/supabase/client';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useDashboardData, useHiddenProjects, usePendingApprovals } from '@/hooks/useDashboardData';
import { useProjectViews } from '@/hooks/useProjectViews';
import JoinByCodeDialog from '@/components/JoinByCodeDialog';
import { toast } from 'sonner';
import { notifyInvitationResponse } from '@/lib/notifications';
import {
  FolderKanban,
  Plus,
  Star,
  KeyRound,
  CheckCircle2,
  MailOpen,
  X as XIcon,
  Check,
  Users,
  Clock,
  Building2,
  FolderOpen,
  User,
  Handshake,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi as viLocale, enUS } from 'date-fns/locale';

import invitationIllustration from '@/assets/invitation-illustration.png';

import type { Group } from '@/types/database';

interface PendingInvitationGroup {
  name: string;
  description: string | null;
  class_code: string | null;
  instructor_name: string | null;
  image_url: string | null;
  created_at: string;
  zalo_link: string | null;
}

interface PendingInvitation {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by: string;
  role: string;
  status: string;
  created_at: string;
  groups?: PendingInvitationGroup | null;
  inviter?: { full_name: string } | null;
  memberCount?: number;
}

interface PendingWorkspaceInvite {
  id: string;
  workspace_id: string;
  scope: string;
  invitee_email: string;
  role_granted: string;
  invited_by: string;
  status: string;
  created_at: string;
  expires_at: string;
  group_id: string | null;
  workspace_name?: string;
  inviter_name?: string;
}

type DashboardView = 'home' | 'starred' | 'recent' | 'all' | 'owned' | 'shared';

export default function Dashboard() {
  const { user, profile, isSystemAdmin, isAdmin, refreshProfile } = useAuth();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const { translations, locale } = useLanguage();
  const t = translations.app?.dashboard;

  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // View from URL or default to 'home'
  const viewParam = (searchParams.get('view') as DashboardView) || 'home';

  const { data: dashboardResult, isLoading } = useDashboardData(user?.id, activeWorkspace?.id, true);
  const { data: hiddenProjectIds = new Set<string>() } = useHiddenProjects(user?.id);
  const { data: pendingApprovalGroups = [] } = usePendingApprovals(user?.id);
  const { starredIds, recentIds, toggleStar } = useProjectViews();

  const groups = dashboardResult?.groups || [];

  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [pendingWsInvites, setPendingWsInvites] = useState<PendingWorkspaceInvite[]>([]);
  const [inviteTab, setInviteTab] = useState<'all' | 'project' | 'workspace'>('all');

  const { isConnected } = useUserPresence('system-global');

  useEffect(() => {
    if (user) {
      fetchPendingInvitations();
      fetchPendingWsInvites();
    }
  }, [user, activeWorkspace?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-invitations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_invitations', filter: `invited_user_id=eq.${user.id}` }, () => { fetchPendingInvitations(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_approvals', filter: `user_id=eq.${user.id}` }, () => { queryClient.invalidateQueries({ queryKey: ['pending-approvals', user.id] }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_invites' }, () => { fetchPendingWsInvites(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchPendingInvitations = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('project_invitations')
        .select('id, group_id, invited_user_id, invited_by, role, status, created_at')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data) {
        const inviterIds = [...new Set(data.map(d => d.invited_by))];
        const groupIds = [...new Set(data.map(d => d.group_id))];
        const [profilesRes, groupsRes, memberCountsRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', inviterIds),
          supabase.from('groups').select('id, name, description, class_code, instructor_name, image_url, created_at, zalo_link').in('id', groupIds),
          Promise.all(groupIds.map(async (gid) => {
            const { count } = await supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('group_id', gid);
            return { id: gid, count: count || 0 };
          })),
        ]);
        const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
        const groupMap = new Map((groupsRes.data || []).map(g => [g.id, g]));
        const countMap = new Map(memberCountsRes.map(c => [c.id, c.count]));
        setPendingInvitations(data.map(d => ({
          ...d,
          inviter: profileMap.get(d.invited_by),
          groups: groupMap.get(d.group_id) || { name: 'Project', description: null, class_code: null, instructor_name: null, image_url: null, created_at: '', zalo_link: null },
          memberCount: countMap.get(d.group_id) || 0,
        })));
      }
    } catch (e) { console.error(e); }
  };

  const handleInvitationResponse = async (invitation: PendingInvitation, accept: boolean) => {
    setProcessingInvitation(invitation.id);
    try {
      const { error: updateError } = await supabase
        .from('project_invitations')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', invitation.id);
      if (updateError) throw updateError;
      if (accept) {
        const { error: memberError } = await supabase.from('group_members').insert({
          group_id: invitation.group_id,
          user_id: invitation.invited_user_id,
          role: invitation.role as any,
        });
        if (memberError) throw memberError;
        const { data: groupData } = await supabase.from('groups').select('workspace_id').eq('id', invitation.group_id).single();
        if (groupData?.workspace_id) {
          await supabase.functions.invoke('workspace-management', {
            body: { action: 'ensure_workspace_member', workspace_id: groupData.workspace_id },
          });
        }
      }
      const { data: leaders } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', invitation.group_id)
        .in('role', ['project_basic:admin', 'project_basic:owner']);
      if (leaders && leaders.length > 0) {
        await notifyInvitationResponse({
          leaderIds: leaders.map(l => l.user_id),
          responderName: profile?.full_name || 'User',
          groupName: invitation.groups?.name || 'Project',
          groupId: invitation.group_id,
          accepted: accept,
        });
      }
      toast.success(accept ? (t?.acceptedInvite || 'Invitation accepted') : (t?.declinedInvite || 'Invitation declined'));
      setPendingInvitations(prev => prev.filter(p => p.id !== invitation.id));
      if (accept) {
        await refreshWorkspaces();
        refreshDashboard();
      }
    } catch (error: any) {
      toast.error(error.message || (t?.errorOccurred || 'An error occurred'));
    } finally {
      setProcessingInvitation(null);
    }
  };

  const fetchPendingWsInvites = async () => {
    if (!user || !profile?.email) return;
    try {
      const { data } = await supabase
        .from('workspace_invites')
        .select('id, workspace_id, scope, invitee_email, role_granted, invited_by, status, created_at, expires_at, group_id')
        .eq('invitee_email', profile.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const wsIds = [...new Set(data.map(d => d.workspace_id))];
        const inviterIds = [...new Set(data.map(d => d.invited_by))];
        const [wsRes, profilesRes] = await Promise.all([
          supabase.from('workspaces').select('id, name').in('id', wsIds),
          supabase.from('profiles').select('id, full_name').in('id', inviterIds),
        ]);
        const wsMap = new Map((wsRes.data || []).map(w => [w.id, w.name]));
        const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.full_name]));
        setPendingWsInvites(data.map(d => ({
          ...d,
          workspace_name: wsMap.get(d.workspace_id) || 'Workspace',
          inviter_name: profileMap.get(d.invited_by) || 'User',
        })));
      } else {
        setPendingWsInvites([]);
      }
    } catch (e) { console.error(e); }
  };

  const handleWsInviteResponse = async (invite: PendingWorkspaceInvite, accept: boolean) => {
    setProcessingInvitation(invite.id);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('workspace-management', {
        body: { action: accept ? 'accept_invite' : 'decline_invite', invite_id: invite.id },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      toast.success(accept ? (t?.acceptedWsInvite || 'Workspace invitation accepted') : (t?.declinedWsInvite || 'Workspace invitation declined'));
      setPendingWsInvites(prev => prev.filter(p => p.id !== invite.id));
      if (accept) {
        await refreshWorkspaces();
        refreshDashboard();
      }
    } catch (error: any) {
      toast.error(error.message || (t?.errorOccurred || 'An error occurred'));
    } finally {
      setProcessingInvitation(null);
    }
  };

  const refreshDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-data', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['pending-approvals', user?.id] });
  }, [queryClient, user?.id]);

  // ── Compute filtered projects based on view ──
  const activeGroups = useMemo(() => groups.filter(g => !hiddenProjectIds.has(g.id)), [groups, hiddenProjectIds]);

  const viewProjects = useMemo(() => {
    switch (viewParam) {
      case 'starred':
        return activeGroups.filter(g => starredIds.has(g.id));
      case 'recent': {
        const ordered: Group[] = [];
        for (const id of recentIds) {
          const g = activeGroups.find(p => p.id === id);
          if (g) ordered.push(g);
        }
        return ordered;
      }
      case 'all':
        return activeGroups;
      case 'owned':
        return activeGroups.filter(g => g.created_by === user?.id);
      case 'shared':
        return activeGroups.filter(g => g.created_by !== user?.id);
      case 'home':
      default: {
        // Home: starred first, then recent (deduped)
        const starred = activeGroups.filter(g => starredIds.has(g.id));
        const recent: Group[] = [];
        for (const id of recentIds) {
          if (!starredIds.has(id)) {
            const g = activeGroups.find(p => p.id === id);
            if (g) recent.push(g);
          }
        }
        return [...starred, ...recent];
      }
    }
  }, [viewParam, activeGroups, starredIds, recentIds, user?.id]);

  const totalInviteCount = pendingInvitations.length + pendingWsInvites.length;

  const getViewTitle = () => {
    switch (viewParam) {
      case 'starred': return '⭐ Starred';
      case 'recent': return '🕑 Recent';
      case 'all': return '📂 All Projects';
      case 'owned': return '👤 Owned by Me';
      case 'shared': return '🤝 Shared with Me';
      default: return `👋 ${locale === 'vi' ? 'Xin chào' : 'Welcome'}, ${profile?.full_name?.split(' ').pop() || ''}`;
    }
  };

  const getViewSubtitle = () => {
    switch (viewParam) {
      case 'starred': return locale === 'vi' ? 'Các project bạn đã đánh dấu sao' : 'Projects you starred';
      case 'recent': return locale === 'vi' ? '10 project truy cập gần nhất' : 'Last 10 accessed projects';
      case 'all': return locale === 'vi' ? 'Tất cả project bạn tham gia' : 'All projects you belong to';
      case 'owned': return locale === 'vi' ? 'Project do bạn tạo' : 'Projects you created';
      case 'shared': return locale === 'vi' ? 'Project bạn được mời tham gia' : 'Projects shared with you';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <>
      {user && profile && !profile.onboarding_completed && (
        <Navigate to="/onboarding" replace />
      )}

      <div className="space-y-6 max-w-6xl mx-auto">
        {/* ── Header: Greeting + Quick Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-heading font-semibold text-foreground">{getViewTitle()}</h1>
            {getViewSubtitle() && (
              <p className="text-sm text-muted-foreground mt-0.5">{getViewSubtitle()}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Invitation button */}
            <Button
              variant="outline"
              size="sm"
              className="relative gap-1.5"
              onClick={() => setShowInvitationDialog(true)}
            >
              <MailOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{t?.invitations || 'Invitations'}</span>
              {totalInviteCount > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground animate-pulse">
                  {totalInviteCount}
                </Badge>
              )}
            </Button>
            {/* Join button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowJoinDialog(true)}
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">{t?.join || 'Join'}</span>
            </Button>
          </div>
        </div>

        <JoinByCodeDialog
          open={showJoinDialog}
          onOpenChange={setShowJoinDialog}
          onJoined={() => { refreshDashboard(); }}
        />

        {/* ── Invitation Dialog ── */}
        <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
          <DialogContent className="sm:max-w-4xl max-w-[95vw] p-0 overflow-hidden border-none sm:aspect-video max-h-[85vh]">
            <div className="flex h-full min-h-0">
              {/* Left illustration */}
              <div className="hidden md:flex w-2/5 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative flex-col items-center justify-center p-8 text-primary-foreground">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/20 blur-3xl" />
                  <div className="absolute bottom-20 right-5 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
                </div>
                <div className="relative z-10 text-center space-y-4">
                  <img src={invitationIllustration} alt="Invitations" className="w-40 h-40 object-contain mx-auto drop-shadow-2xl" />
                  <h2 className="text-lg font-heading font-semibold">{t?.invitationTitle || 'Invitations'}</h2>
                  <p className="text-sm opacity-80">{t?.invitationDesc || 'Project and workspace invitations.'}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-background">
                <div className="p-6 pb-3 border-b">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <MailOpen className="w-5 h-5 text-primary" />
                      {t?.pendingInvitations || 'Pending invitations'}
                      {totalInviteCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs">{totalInviteCount}</Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription>{t?.acceptOrDecline || 'Accept or decline invitations'}</DialogDescription>
                  </DialogHeader>
                </div>

                <Tabs value={inviteTab} onValueChange={(v) => setInviteTab(v as any)} className="flex-1 flex flex-col min-h-0">
                  <div className="px-6 pt-3">
                    <TabsList className="w-full">
                      <TabsTrigger value="all" className="flex-1 text-xs">
                        {t?.all || 'All'}
                        {totalInviteCount > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{totalInviteCount}</Badge>}
                      </TabsTrigger>
                      <TabsTrigger value="project" className="flex-1 text-xs">
                        Project
                        {pendingInvitations.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{pendingInvitations.length}</Badge>}
                      </TabsTrigger>
                      <TabsTrigger value="workspace" className="flex-1 text-xs">
                        Workspace
                        {pendingWsInvites.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{pendingWsInvites.length}</Badge>}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    {((inviteTab === 'all' && totalInviteCount === 0) ||
                      (inviteTab === 'project' && pendingInvitations.length === 0) ||
                      (inviteTab === 'workspace' && pendingWsInvites.length === 0)) && (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <MailOpen className="w-8 h-8 opacity-40" />
                        </div>
                        <p className="font-medium">{t?.noInvitations || 'No invitations'}</p>
                        <p className="text-sm mt-1">{t?.willNotifyWhenNew || "You'll be notified when there are new invitations"}</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {(inviteTab === 'all' || inviteTab === 'project') && pendingInvitations.map((inv) => (
                        <div key={inv.id} className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            {inv.groups?.image_url ? (
                              <img src={inv.groups.image_url} alt={inv.groups?.name || 'Project'} className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FolderKanban className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground truncate">{inv.groups?.name || 'Project'}</p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge variant="outline" className="text-[10px]">Project</Badge>
                                  <Badge variant="secondary" className="text-[10px]">{inv.role === 'project_basic:admin' ? (t?.viceLeader || 'Vice leader') : (t?.member || 'Member')}</Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t?.invitedBy || 'Invited by'} <span className="font-medium text-foreground">{inv.inviter?.full_name || 'Leader'}</span>
                                {' · '}
                                {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: locale === 'vi' ? viLocale : enUS })}
                              </p>
                            </div>
                          </div>
                          {inv.groups?.description && <p className="text-xs text-muted-foreground line-clamp-2 pl-[60px]">{inv.groups.description}</p>}
                          <div className="flex flex-wrap gap-1.5 pl-[60px]">
                            {inv.groups?.class_code && <Badge variant="outline" className="text-[10px] gap-1 h-5">{t?.classLabel || 'Class:'} {inv.groups.class_code}</Badge>}
                            {inv.groups?.instructor_name && <Badge variant="outline" className="text-[10px] gap-1 h-5">{t?.instructorLabel || 'Instructor:'} {inv.groups.instructor_name}</Badge>}
                            <Badge variant="outline" className="text-[10px] gap-1 h-5"><Users className="w-3 h-3" />{(t?.membersCount || '{n} members').replace('{n}', String(inv.memberCount ?? 0))}</Badge>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleInvitationResponse(inv, false)} disabled={processingInvitation === inv.id}>
                              {t?.decline || 'Decline'}
                            </Button>
                            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => handleInvitationResponse(inv, true)} disabled={processingInvitation === inv.id}>
                              {processingInvitation === inv.id ? <Spinner size="sm" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {t?.accept || 'Accept'}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(inviteTab === 'all' || inviteTab === 'workspace') && pendingWsInvites.map((inv) => (
                        <div key={inv.id} className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0"><Building2 className="w-6 h-6 text-accent-foreground" /></div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground truncate">{inv.workspace_name}</p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Workspace</Badge>
                                  <Badge variant="secondary" className="text-[10px]">{inv.role_granted === 'workspace:admin' ? 'Admin' : (t?.member || 'Member')}</Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t?.invitedBy || 'Invited by'} <span className="font-medium text-foreground">{inv.inviter_name}</span>
                                {' · '}
                                {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: locale === 'vi' ? viLocale : enUS })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleWsInviteResponse(inv, false)} disabled={processingInvitation === inv.id}>
                              {t?.decline || 'Decline'}
                            </Button>
                            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => handleWsInviteResponse(inv, true)} disabled={processingInvitation === inv.id}>
                              {processingInvitation === inv.id ? <Spinner size="sm" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {t?.accept || 'Accept'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Tabs>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Home view: sections ── */}
        {viewParam === 'home' && starredIds.size > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" /> Starred
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {activeGroups.filter(g => starredIds.has(g.id)).map((group) => (
                <DashboardProjectCard
                  key={group.id}
                  group={group}
                  isStarred={starredIds.has(group.id)}
                  onToggleStar={toggleStar}
                />
              ))}
            </div>
          </section>
        )}

        {viewParam === 'home' && recentIds.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Recent
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {(() => {
                const recentProjects: Group[] = [];
                for (const id of recentIds) {
                  if (viewParam === 'home' && starredIds.has(id)) continue;
                  const g = activeGroups.find(p => p.id === id);
                  if (g) recentProjects.push(g);
                }
                return recentProjects.map((group) => (
                  <DashboardProjectCard
                    key={group.id}
                    group={group}
                    isStarred={starredIds.has(group.id)}
                    onToggleStar={toggleStar}
                  />
                ));
              })()}
            </div>
          </section>
        )}

        {/* ── Non-home views: single grid ── */}
        {viewParam !== 'home' && (
          <section>
            {viewProjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {viewParam === 'starred'
                    ? (locale === 'vi' ? 'Chưa có project nào được đánh dấu sao' : 'No starred projects yet')
                    : viewParam === 'recent'
                    ? (locale === 'vi' ? 'Chưa truy cập project nào gần đây' : 'No recent projects')
                    : (locale === 'vi' ? 'Không có project nào' : 'No projects')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {viewProjects.map((group) => (
                  <DashboardProjectCard
                    key={group.id}
                    group={group}
                    isStarred={starredIds.has(group.id)}
                    onToggleStar={toggleStar}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Home empty state */}
        {viewParam === 'home' && starredIds.size === 0 && recentIds.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">
              {locale === 'vi' ? 'Chưa có hoạt động nào' : 'No activity yet'}
            </p>
            <p className="text-xs">
              {locale === 'vi' ? 'Tham gia hoặc tạo project để bắt đầu' : 'Join or create a project to get started'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowJoinDialog(true)}>
                <KeyRound className="w-4 h-4" />
                {t?.join || 'Join'}
              </Button>
              {activeWorkspace && (
                <Link to="/groups">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    {locale === 'vi' ? 'Tạo Project' : 'New Project'}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
