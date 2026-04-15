import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/UserAvatar';
import DashboardProjectCard from '@/components/dashboard/DashboardProjectCard';
import { supabase } from '@/integrations/supabase/client';
import { useUserPresence } from '@/hooks/useUserPresence';
import UserPresenceIndicator from '@/components/UserPresenceIndicator';
import { Navigate } from 'react-router-dom';
import { useDashboardData, useRecentProjects, useVideoSettings } from '@/hooks/useDashboardData';

import { getSystemRoleLabel } from '@/lib/roleLabels';
import JoinByCodeDialog from '@/components/JoinByCodeDialog';
import { toast } from 'sonner';
import { notifyInvitationResponse } from '@/lib/notifications';
import {
  FolderKanban,
  ArrowRight,
  Plus,
  // Loader2 replaced by Spinner
  Sparkles,
  Shield,
  Star,
  User,
  KeyRound,
  Crown,
  Zap,
  ShoppingBag,
  Calendar,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  MailOpen,
  X as XIcon,
  Check,
  Users,
  Building2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi as viLocale, enUS } from 'date-fns/locale';

import invitationIllustration from '@/assets/invitation-illustration.png';

import type { Group } from '@/types/database';

// Removed hard-coded DEFAULT_PROJECT_LIMIT — limits come from plan_limits table

type ProjectModeFilter = 'all' | 'basic' | 'custom';

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

export default function Dashboard() {
  const { user, profile, mustChangePassword, refreshProfile, isSystemAdmin: isLeader, isAdmin, isSystemAdmin } = useAuth();
  const { activeWorkspace, isAvailable: wsAvailable, refreshWorkspaces } = useWorkspace();
  const { translations, locale } = useLanguage();
  const t = translations.app?.dashboard;
  

  const queryClient = useQueryClient();

  // React Query hooks for data fetching with caching
  const { data: dashboardResult, isLoading } = useDashboardData(user?.id, activeWorkspace?.id, wsAvailable);
  const { data: videoSettings } = useVideoSettings();

  const groups = dashboardResult?.groups || [];
  const ownedProjectCount = dashboardResult?.ownedProjectCount || 0;
  const joinedProjectCount = dashboardResult?.joinedProjectCount || 0;
  const videoEnabled = videoSettings?.enabled || false;
  const videoOpacity = videoSettings?.opacity || 0.2;
  const videoUrl = videoSettings?.url || '';

  const { data: recentProjects = [] } = useRecentProjects(user?.id, groups);

  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [pendingWsInvites, setPendingWsInvites] = useState<PendingWorkspaceInvite[]>([]);
  const [inviteTab, setInviteTab] = useState<'all' | 'project' | 'workspace'>('all');

  const { isConnected } = useUserPresence('system-global');

  useEffect(() => {
    if (user) {
      // Invitations and workspace invites still use local state (not yet migrated)
      fetchPendingInvitations();
      fetchPendingWsInvites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeWorkspace?.id]);

  // Realtime for invitations and pending approvals
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-invitations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_invitations', filter: `invited_user_id=eq.${user.id}` },
        () => { fetchPendingInvitations(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_approvals', filter: `user_id=eq.${user.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ['pending-approvals', user.id] }); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspace_invites' },
        () => { fetchPendingWsInvites(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);


  // fetchPendingApprovals now handled by usePendingApprovals hook

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

        // Auto-add to workspace as member
        const { data: groupData } = await supabase
          .from('groups')
          .select('workspace_id')
          .eq('id', invitation.group_id)
          .single();

        if (groupData?.workspace_id) {
          await supabase.functions.invoke('workspace-management', {
            body: {
              action: 'ensure_workspace_member',
              workspace_id: groupData.workspace_id,
            },
          });
        }
      }

      // Notify leader(s)
      const { data: leaders } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', invitation.group_id)
        .in('role', ['project_basic:admin', 'project_basic:owner']);

      if (leaders && leaders.length > 0) {
        await notifyInvitationResponse({
          leaderIds: leaders.map(l => l.user_id),
          responderName: profile?.full_name || 'Người dùng',
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
          inviter_name: profileMap.get(d.invited_by) || 'Người mời',
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
        body: {
          action: accept ? 'accept_invite' : 'decline_invite',
          invite_id: invite.id,
        },
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

  // fetchProjectStats removed — stats computed from fetchDashboardData results

  // fetchHiddenProjects now handled by useHiddenProjects hook

  // Permission: workspace_owner, workspace_admin, or system_admin can create projects
  const wsRole = (activeWorkspace as any)?.my_role;
  const canCreateProject = isSystemAdmin || wsRole === 'workspace:owner' || wsRole === 'workspace:admin';

  const refreshDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-data', user?.id] });
  }, [queryClient, user?.id]);

  const getRoleBadge = () => {
    if (isAdmin) return (
      <Badge variant="outline" className="bg-accent text-foreground border-border gap-1 font-medium text-[10px] shadow-none">
        <Shield className="w-3 h-3" strokeWidth={1.5} />
        {t?.ownerSystem || 'OwnerSystem'}
      </Badge>
    );
    if (isLeader) return (
      <Badge variant="outline" className="bg-accent text-foreground border-border gap-1 font-medium text-[10px] shadow-none">
        <Star className="w-3 h-3" strokeWidth={1.5} />
        {t?.advancedMember || 'Advanced Member'}
      </Badge>
    );
    return (
      <Badge variant="outline" className="bg-accent text-muted-foreground border-border gap-1 font-medium text-[10px] shadow-none">
        <User className="w-3 h-3" strokeWidth={1.5} />
        {t?.memberRole || 'Member'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" className="text-primary" />
        </div>
      </>
    );
  }

  return (
    <>

      {videoEnabled && videoUrl && (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: videoOpacity, zIndex: 0 }}
            src={videoUrl}
          />
          <div
            className="fixed inset-0 bg-background/60 pointer-events-none"
            style={{ zIndex: 1 }}
          />
        </>
      )}

      {user && profile && !profile.onboarding_completed && (
        <Navigate to="/onboarding" replace />
      )}

      
      <div className="relative space-y-8" style={{ zIndex: 2 }}>
        {/* Welcome Section — Frosted Glass style (Light & Dark mode compatible) */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 dark:border-primary/20 bg-gradient-to-br from-white/80 via-white/60 to-primary/10 dark:from-background/80 dark:via-background/60 dark:to-primary/20 backdrop-blur-xl shadow-md">
          <div className="relative px-6 py-5">
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <UserAvatar
                  src={profile?.avatar_url}
                  name={profile?.full_name}
                  size="xl"
                  className="border-2 border-border shadow-none"
                  showPresence={isConnected}
                  presenceStatus="online"
                />
                <div className="flex flex-wrap gap-1 justify-center">
                  {getRoleBadge()}
                </div>
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-heading font-bold leading-tight text-foreground">{profile?.full_name}</h1>
                <p className="text-sm mt-0.5 text-muted-foreground">
                  {profile?.institution ? `${profile.institution} • ` : ''}MSSV: {profile?.student_id}
                </p>
                {profile?.created_at && (
                  <p className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground/70">
                    <Calendar className="w-3 h-3" />
                    {t?.joinedFrom || 'Joined'} {format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: locale === 'vi' ? viLocale : enUS })}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {profile?.is_approved && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-accent text-muted-foreground border-border">
                      <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {t?.verified || 'Verified'}
                    </Badge>
                  )}
                  {isSystemAdmin ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-accent text-muted-foreground border-border">
                      <Unlock className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {t?.unlimitedProjects || 'Unlimited project creation'}
                    </Badge>
                  ) : canCreateProject ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-accent text-muted-foreground border-border">
                      <Unlock className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {t?.canCreateProjects || 'Can create projects'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-accent text-muted-foreground/70 border-border">
                      <Lock className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {t?.joinOnly || 'Join only — cannot create projects'}
                    </Badge>
                  )}
                </div>
              </div>


              {/* Stats */}
              <div className="hidden lg:flex items-center gap-4 ml-auto pl-5 border-l border-border">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none text-foreground">{joinedProjectCount}</p>
                    <p className="text-[10px] text-muted-foreground">Joined</p>
                  </div>
                </div>

                <div className="w-px h-8 bg-border" />

                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-orange-500/10">
                    <Crown className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none text-foreground">{ownedProjectCount}</p>
                    <p className="text-[10px] text-muted-foreground">Owned</p>
                  </div>
                </div>
              </div>

              {/* Desktop buttons: Invitation + Join */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                {/* Invitation button */}
                <button
                  onClick={() => setShowInvitationDialog(true)}
                  className="group relative overflow-hidden rounded-xl px-4 py-3 font-medium transition-all duration-150 ease-in-out hover:bg-accent text-foreground border border-border"
                >
                  <span className="relative flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-pink-500/10">
                      <MailOpen className="w-3.5 h-3.5 text-pink-500" />
                    </div>
                     <div className="text-left">
                       <p className="text-sm font-semibold leading-tight">{t?.invitations || 'Invitations'}</p>
                       <p className="text-[10px] text-muted-foreground leading-tight">invites</p>
                    </div>
                    {(pendingInvitations.length + pendingWsInvites.length) > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse shadow-sm">
                        {pendingInvitations.length + pendingWsInvites.length}
                      </span>
                    )}
                  </span>
                </button>

                {/* Join Project button */}
                <button
                  onClick={() => setShowJoinDialog(true)}
                  className="group relative overflow-hidden rounded-xl px-4 py-3 font-medium transition-all duration-150 ease-in-out hover:bg-accent text-foreground border border-border"
                >
                  <span className="relative flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-500/10">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold leading-tight">{t?.join || 'Join'}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">by code</p>
                    </div>
                  </span>
                </button>
              </div>
            </div>

            {/* Mobile stats + buttons */}
            <div className="flex lg:hidden items-center justify-between mt-3 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">{joinedProjectCount}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">{ownedProjectCount}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowInvitationDialog(true)} className="relative border-border">
                  <MailOpen className="w-4 h-4" />
                  {(pendingInvitations.length + pendingWsInvites.length) > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">
                      {pendingInvitations.length + pendingWsInvites.length}
                    </span>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowJoinDialog(true)} className="border-border">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <JoinByCodeDialog
          open={showJoinDialog}
          onOpenChange={setShowJoinDialog}
          onJoined={() => { refreshDashboard(); }}
        />

        {/* Invitation Dialog — 16:9 split layout */}
        <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
          <DialogContent className="sm:max-w-4xl max-w-[95vw] p-0 overflow-hidden border-none sm:aspect-video max-h-[85vh]">
            <div className="flex h-full min-h-0">
              {/* Left — Illustration */}
              <div className="hidden md:flex w-2/5 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative flex-col items-center justify-center p-8 text-primary-foreground">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/20 blur-3xl" />
                  <div className="absolute bottom-20 right-5 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
                </div>
                <div className="relative z-10 text-center space-y-4">
                  <img src={invitationIllustration} alt={t?.invitationIllustrationAlt || 'Join invitation'} className="w-40 h-40 object-contain mx-auto drop-shadow-2xl" />
                   <h2 className="text-lg font-heading font-semibold">{t?.invitationTitle || 'Invitations'}</h2>
                   <p className="text-sm opacity-80 leading-relaxed">
                     {t?.invitationDesc || 'List of Project and Workspace invitations you have received.'}
                   </p>
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                      <Check className="w-3.5 h-3.5" />
                      <span>{t?.acceptToJoin || 'Accept to join'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                      <XIcon className="w-3.5 h-3.5" />
                      <span>{t?.declineIfNot || "Decline if you don't want to"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-background">
                <div className="p-6 pb-3 border-b">
                  <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-lg">
                       <MailOpen className="w-5 h-5 text-primary" />
                       {t?.pendingInvitations || 'Pending invitations'}
                       {(pendingInvitations.length + pendingWsInvites.length) > 0 && (
                         <Badge className="bg-primary text-primary-foreground text-xs">
                           {pendingInvitations.length + pendingWsInvites.length}
                         </Badge>
                       )}
                     </DialogTitle>
                     <DialogDescription>
                       {t?.acceptOrDecline || 'Accept or decline invitations'}
                     </DialogDescription>
                  </DialogHeader>
                </div>

                <Tabs value={inviteTab} onValueChange={(v) => setInviteTab(v as any)} className="flex-1 flex flex-col min-h-0">
                  <div className="px-6 pt-3">
                    <TabsList className="w-full">
                      <TabsTrigger value="all" className="flex-1 text-xs">
                        {t?.all || 'All'}
                        {(pendingInvitations.length + pendingWsInvites.length) > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{pendingInvitations.length + pendingWsInvites.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="project" className="flex-1 text-xs">
                        Project
                        {pendingInvitations.length > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{pendingInvitations.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="workspace" className="flex-1 text-xs">
                        Workspace
                        {pendingWsInvites.length > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{pendingWsInvites.length}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    {/* Empty state */}
                    {((inviteTab === 'all' && pendingInvitations.length === 0 && pendingWsInvites.length === 0) ||
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
                      {/* Project invitations */}
                      {(inviteTab === 'all' || inviteTab === 'project') && pendingInvitations.map((inv) => (
                        <div
                          key={inv.id}
                          className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            {inv.groups?.image_url ? (
                              <img
                                src={inv.groups.image_url}
                                alt={inv.groups?.name || 'Project'}
                                className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FolderKanban className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground truncate">
                                  {inv.groups?.name || 'Project'}
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge variant="outline" className="text-[10px]">Project</Badge>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {inv.role === 'project_basic:admin' ? (t?.viceLeader || 'Vice leader') : (t?.member || 'Member')}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t?.invitedBy || 'Invited by'} <span className="font-medium text-foreground">{inv.inviter?.full_name || 'Leader'}</span>
                                {' · '}
                                {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: locale === 'vi' ? viLocale : enUS })}
                              </p>
                            </div>
                          </div>

                          {inv.groups?.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 pl-[60px]">
                              {inv.groups.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-1.5 pl-[60px]">
                            {inv.groups?.class_code && (
                              <Badge variant="outline" className="text-[10px] gap-1 h-5">
                                {t?.classLabel || 'Class:'} {inv.groups.class_code}
                              </Badge>
                            )}
                            {inv.groups?.instructor_name && (
                              <Badge variant="outline" className="text-[10px] gap-1 h-5">
                                {t?.instructorLabel || 'Instructor:'} {inv.groups.instructor_name}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] gap-1 h-5">
                              <Users className="w-3 h-3" />
                              {(t?.membersCount || '{n} members').replace('{n}', String(inv.memberCount ?? 0))}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleInvitationResponse(inv, false)}
                              disabled={processingInvitation === inv.id}
                            >
                              {t?.decline || 'Decline'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleInvitationResponse(inv, true)}
                              disabled={processingInvitation === inv.id}
                            >
                              {processingInvitation === inv.id ? (
                                <Spinner size="sm" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              {t?.accept || 'Accept'}
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Workspace invitations */}
                      {(inviteTab === 'all' || inviteTab === 'workspace') && pendingWsInvites.map((inv) => (
                        <div
                          key={inv.id}
                          className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
                              <Building2 className="w-6 h-6 text-accent-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground truncate">
                                  {inv.workspace_name}
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Workspace</Badge>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {inv.role_granted === 'workspace:admin' ? 'Admin' : (t?.member || 'Member')}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t?.invitedBy || 'Invited by'} <span className="font-medium text-foreground">{inv.inviter_name}</span>
                                {' · '}
                                {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: locale === 'vi' ? viLocale : enUS })}
                              </p>
                            </div>
                          </div>

                          <div className="pl-[60px]">
                            <p className="text-xs text-muted-foreground">
                              {t?.wsAccessAfterAccept || 'You will have access to all projects in this workspace after accepting.'}
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleWsInviteResponse(inv, false)}
                              disabled={processingInvitation === inv.id}
                            >
                              {t?.decline || 'Decline'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleWsInviteResponse(inv, true)}
                              disabled={processingInvitation === inv.id}
                            >
                              {processingInvitation === inv.id ? (
                                <Spinner size="sm" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
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

        {/* Recent Projects */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-heading font-semibold">{t?.recentProjects || 'Recent Projects'}</CardTitle>
                <CardDescription>{t?.projectsYouJoined || 'Projects you are participating in'}</CardDescription>
              </div>
              <Link to="/groups">
                <Button variant="outline" size="sm" className="gap-1.5">
                  {t?.viewAllProj || (locale === 'vi' ? 'Xem tất cả' : 'View all')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 opacity-30" />
                {!activeWorkspace ? (
                  <>
                    <p className="text-lg font-medium mb-1">
                      {locale === 'vi' ? 'Bạn chưa có Workspace nào' : 'You don\'t have a Workspace yet'}
                    </p>
                    <p className="text-sm mb-4">
                      {locale === 'vi' ? 'Tạo Workspace trước để bắt đầu quản lý dự án' : 'Create a Workspace first to start managing projects'}
                    </p>
                    <Link to="/workspace/new">
                      <Button className="gap-2" size="sm">
                        <Plus className="w-4 h-4" />
                        {locale === 'vi' ? 'Tạo Workspace ngay' : 'Create Workspace now'}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-1">
                      {t?.notJoinedYet || "You haven't joined any projects yet"}
                    </p>
                    <p className="text-sm">
                      {t?.contactLeader || 'Contact Leader to be added to a project'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3">
                {recentProjects.map((group) => (
                  <DashboardProjectCard
                    key={group.id}
                    group={group}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
