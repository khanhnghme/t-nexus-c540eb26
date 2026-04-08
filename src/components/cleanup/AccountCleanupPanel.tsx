import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAccountLimitsCheck } from '@/hooks/useAccountLimitsCheck';
import { deleteTaskFiles } from '@/lib/storageCleanup';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Building2, FolderKanban, Users, HardDrive,
  ChevronDown, ChevronRight, Trash2, Loader2,
  CheckCircle2, AlertTriangle, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectInfo {
  id: string;
  name: string;
  taskCount: number;
  storageMb: number;
  workspace_id: string;
}

interface WorkspaceInfo {
  id: string;
  name: string;
  projectCount: number;
  memberCount: number;
  storageMb: number;
  projects: ProjectInfo[];
}

interface AccountCleanupPanelProps {
  onCleanupComplete?: () => void;
}

export function AccountCleanupPanel({ onCleanupComplete }: AccountCleanupPanelProps) {
  const { user } = useAuth();
  const { workspaces, refreshWorkspaces } = useWorkspace();
  const limits = useAccountLimitsCheck();

  const [wsInfos, setWsInfos] = useState<WorkspaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [selectedWs, setSelectedWs] = useState<Set<string>>(new Set());
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (user) fetchData();
  }, [user, workspaces]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ownedWs = workspaces.filter(w => w.owner_id === user.id);
      if (ownedWs.length === 0) { setWsInfos([]); setLoading(false); return; }

      const wsIds = ownedWs.map(w => w.id);

      // Fetch projects, members, storage in parallel
      const [groupsRes, membersRes] = await Promise.all([
        supabase.from('groups').select('id, name, workspace_id').in('workspace_id', wsIds),
        supabase.from('workspace_members').select('workspace_id').in('workspace_id', wsIds),
      ]);

      const groups = groupsRes.data || [];
      const members = membersRes.data || [];

      // Member count per WS
      const memberMap: Record<string, number> = {};
      members.forEach(m => {
        if (m.workspace_id) memberMap[m.workspace_id] = (memberMap[m.workspace_id] || 0) + 1;
      });

      // Task count per project
      const groupIds = groups.map(g => g.id);
      let taskCountMap: Record<string, number> = {};
      if (groupIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('group_id')
          .in('group_id', groupIds);
        (tasks || []).forEach(t => {
          if (t.group_id) taskCountMap[t.group_id] = (taskCountMap[t.group_id] || 0) + 1;
        });
      }

      // Storage per WS (via RPC)
      const storagePromises = ownedWs.map(async ws => {
        const { data } = await supabase.rpc('get_workspace_storage_usage', { _workspace_id: ws.id });
        return { wsId: ws.id, mb: Math.round(Number(data) || 0) };
      });
      const storageResults = await Promise.all(storagePromises);
      const storageMap: Record<string, number> = {};
      storageResults.forEach(r => { storageMap[r.wsId] = r.mb; });

      // Per-project storage estimation (sum file_size from project_resources + submission_history)
      const projectStorageMap: Record<string, number> = {};
      if (groupIds.length > 0) {
        const [prRes, shRes] = await Promise.all([
          supabase.from('project_resources').select('group_id, file_size').in('group_id', groupIds).gt('file_size', 0),
          supabase.from('tasks').select('id, group_id').in('group_id', groupIds),
        ]);
        (prRes.data || []).forEach(r => {
          if (r.group_id) projectStorageMap[r.group_id] = (projectStorageMap[r.group_id] || 0) + (r.file_size || 0);
        });

        // Get submission_history file sizes via tasks
        if (shRes.data && shRes.data.length > 0) {
          const taskIds = shRes.data.map(t => t.id);
          const taskGroupMap: Record<string, string> = {};
          shRes.data.forEach(t => { taskGroupMap[t.id] = t.group_id; });

          // Batch in chunks of 100
          for (let i = 0; i < taskIds.length; i += 100) {
            const chunk = taskIds.slice(i, i + 100);
            const { data: subs } = await supabase
              .from('submission_history')
              .select('task_id, file_size')
              .in('task_id', chunk)
              .not('file_size', 'is', null)
              .gt('file_size', 0);
            (subs || []).forEach(s => {
              const gId = taskGroupMap[s.task_id];
              if (gId) projectStorageMap[gId] = (projectStorageMap[gId] || 0) + (s.file_size || 0);
            });
          }
        }
      }

      // Convert bytes to MB for projects
      Object.keys(projectStorageMap).forEach(k => {
        projectStorageMap[k] = Math.round(projectStorageMap[k] / (1024 * 1024));
      });

      const infos: WorkspaceInfo[] = ownedWs.map(ws => {
        const wsGroups = groups.filter(g => g.workspace_id === ws.id);
        return {
          id: ws.id,
          name: ws.name,
          projectCount: wsGroups.length,
          memberCount: (memberMap[ws.id] || 0) + 1, // +1 for owner
          storageMb: storageMap[ws.id] || 0,
          projects: wsGroups.map(g => ({
            id: g.id,
            name: g.name,
            taskCount: taskCountMap[g.id] || 0,
            storageMb: projectStorageMap[g.id] || 0,
            workspace_id: ws.id,
          })),
        };
      });

      setWsInfos(infos);
    } catch (err) {
      console.warn('Error fetching cleanup data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle helpers
  const toggleExpand = (wsId: string) => {
    setExpandedWs(prev => {
      const next = new Set(prev);
      next.has(wsId) ? next.delete(wsId) : next.add(wsId);
      return next;
    });
  };

  const toggleWs = (wsId: string) => {
    setSelectedWs(prev => {
      const next = new Set(prev);
      if (next.has(wsId)) {
        next.delete(wsId);
        // Also deselect all projects in this WS
        const ws = wsInfos.find(w => w.id === wsId);
        if (ws) {
          const nextProjects = new Set(selectedProjects);
          ws.projects.forEach(p => nextProjects.delete(p.id));
          setSelectedProjects(nextProjects);
        }
      } else {
        next.add(wsId);
        // Also select all projects in this WS
        const ws = wsInfos.find(w => w.id === wsId);
        if (ws) {
          const nextProjects = new Set(selectedProjects);
          ws.projects.forEach(p => nextProjects.add(p.id));
          setSelectedProjects(nextProjects);
        }
      }
      return next;
    });
  };

  const toggleProject = (projectId: string, wsId: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      next.has(projectId) ? next.delete(projectId) : next.add(projectId);
      return next;
    });
    // If all projects of WS are selected, auto-select WS
    // If some deselected, deselect WS
    const ws = wsInfos.find(w => w.id === wsId);
    if (ws) {
      const updatedProjects = new Set(selectedProjects);
      updatedProjects.has(projectId) ? updatedProjects.delete(projectId) : updatedProjects.add(projectId);
      const allSelected = ws.projects.every(p => updatedProjects.has(p.id));
      setSelectedWs(prev => {
        const next = new Set(prev);
        allSelected ? next.add(wsId) : next.delete(wsId);
        return next;
      });
    }
  };

  // Live preview calculations
  const preview = useMemo(() => {
    let removedWs = 0;
    let removedProjects = 0;
    let removedStorageMb = 0;

    wsInfos.forEach(ws => {
      if (selectedWs.has(ws.id)) {
        removedWs++;
        removedProjects += ws.projectCount;
        removedStorageMb += ws.storageMb;
      } else {
        ws.projects.forEach(p => {
          if (selectedProjects.has(p.id)) {
            removedProjects++;
            removedStorageMb += p.storageMb;
          }
        });
      }
    });

    const currentWs = wsInfos.length;
    const currentProjects = wsInfos.reduce((s, w) => s + w.projectCount, 0);
    const currentStorageMb = wsInfos.reduce((s, w) => s + w.storageMb, 0);

    const afterWs = currentWs - removedWs;
    const afterProjects = currentProjects - removedProjects;
    const afterStorageMb = currentStorageMb - removedStorageMb;

    const maxWs = limits.maxWorkspaces;
    const maxProjects = limits.maxProjects;
    const maxStorageMb = limits.maxStorageMb;

    const wsOk = maxWs === null || afterWs <= maxWs;
    const projectsOk = maxProjects === null || afterProjects <= maxProjects;
    const storageOk = maxStorageMb === null || afterStorageMb <= maxStorageMb;
    const membersOk = limits.maxMembers === null || limits.uniqueMembers <= limits.maxMembers;
    const allOk = wsOk && projectsOk && storageOk && membersOk;

    return {
      removedWs, removedProjects, removedStorageMb,
      afterWs, afterProjects, afterStorageMb,
      wsOk, projectsOk, storageOk, membersOk, allOk,
      hasSelection: removedWs > 0 || removedProjects > 0,
    };
  }, [wsInfos, selectedWs, selectedProjects, limits]);

  // Delete logic
  const handleDelete = async () => {
    if (confirmText !== 'XÁC NHẬN') return;
    setDeleting(true);
    try {
      // 1. Delete individual projects (not part of deleted workspaces)
      for (const ws of wsInfos) {
        if (selectedWs.has(ws.id)) continue; // Will be handled by workspace delete
        for (const project of ws.projects) {
          if (!selectedProjects.has(project.id)) continue;
          await deleteProject(project.id);
        }
      }

      // 2. Delete selected workspaces
      for (const wsId of Array.from(selectedWs)) {
        await supabase.functions.invoke('workspace-management', {
          body: { action: 'delete_workspace', workspace_id: wsId },
        });
      }

      toast.success('Đã dọn dẹp thành công!');
      setSelectedWs(new Set());
      setSelectedProjects(new Set());
      setConfirmOpen(false);
      setConfirmText('');

      // Refresh
      await refreshWorkspaces();
      limits.refresh();
      onCleanupComplete?.();
      await fetchData();
    } catch (err: any) {
      console.error('Cleanup error:', err);
      toast.error('Có lỗi xảy ra khi dọn dẹp: ' + (err.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  const deleteProject = async (groupId: string) => {
    // Clean up files first
    const { data: tasks } = await supabase.from('tasks').select('id').eq('group_id', groupId);
    if (tasks) {
      for (const task of tasks) {
        await deleteTaskFiles(task.id);
      }
    }

    // Delete related data in order
    await supabase.from('submission_history').delete().in('task_id', (tasks || []).map(t => t.id));
    await supabase.from('task_scores').delete().in('task_id', (tasks || []).map(t => t.id));
    await supabase.from('task_assignments').delete().in('task_id', (tasks || []).map(t => t.id));
    await supabase.from('task_comments').delete().in('task_id', (tasks || []).map(t => t.id));

    const { data: taskNotes } = await supabase.from('task_notes').select('id').eq('task_id', (tasks || []).map(t => t.id));
    if (taskNotes && taskNotes.length > 0) {
      await supabase.from('task_note_attachments').delete().in('note_id', taskNotes.map(n => n.id));
      await supabase.from('task_notes').delete().in('id', taskNotes.map(n => n.id));
    }

    await supabase.from('tasks').delete().eq('group_id', groupId);

    // Delete stages & stage scores
    const { data: stages } = await supabase.from('stages').select('id').eq('group_id', groupId);
    if (stages && stages.length > 0) {
      await supabase.from('member_stage_scores').delete().in('stage_id', stages.map(s => s.id));
      await supabase.from('stage_weights').delete().in('stage_id', stages.map(s => s.id));
      await supabase.from('stages').delete().eq('group_id', groupId);
    }

    await supabase.from('member_final_scores').delete().eq('group_id', groupId);
    await supabase.from('pending_approvals').delete().eq('group_id', groupId);
    await supabase.from('project_invitations').delete().eq('group_id', groupId);
    await supabase.from('project_resources').delete().eq('group_id', groupId);
    await supabase.from('resource_folders').delete().eq('group_id', groupId);
    await supabase.from('project_messages').delete().eq('group_id', groupId);
    await supabase.from('activity_logs').delete().eq('group_id', groupId);
    await supabase.from('group_members').delete().eq('group_id', groupId);
    await supabase.from('hidden_projects').delete().eq('group_id', groupId);
    await supabase.from('groups').delete().eq('id', groupId);
  };

  const formatStorage = (mb: number) => mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`;

  const isOverLimit = (current: number, max: number | null) => max !== null && current > max;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
        <Shield className="w-5 h-5 text-destructive" />
        Dọn dẹp tài khoản
      </h2>
      <p className="text-sm text-muted-foreground">
        Chọn workspace hoặc project cần xóa để giảm mức sử dụng xuống dưới hạn mức gói Free.
      </p>

      {/* Summary of limits */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Workspace',
                current: preview.afterWs,
                max: limits.maxWorkspaces,
                original: wsInfos.length,
                ok: preview.wsOk,
                icon: Building2,
              },
              {
                label: 'Projects',
                current: preview.afterProjects,
                max: limits.maxProjects,
                original: wsInfos.reduce((s, w) => s + w.projectCount, 0),
                ok: preview.projectsOk,
                icon: FolderKanban,
              },
              {
                label: 'Thành viên',
                current: limits.uniqueMembers,
                max: limits.maxMembers,
                original: limits.uniqueMembers,
                ok: preview.membersOk,
                icon: Users,
              },
              {
                label: 'Dung lượng',
                current: preview.afterStorageMb,
                max: limits.maxStorageMb,
                original: wsInfos.reduce((s, w) => s + w.storageMb, 0),
                ok: preview.storageOk,
                icon: HardDrive,
                format: true,
              },
            ].map((item) => {
              const Icon = item.icon;
              const displayCurrent = item.format ? formatStorage(item.current) : item.current;
              const displayMax = item.max !== null ? (item.format ? formatStorage(item.max) : item.max) : '∞';
              const changed = item.current !== item.original;

              return (
                <div key={item.label} className={`rounded-lg p-3 border ${item.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-destructive/20 bg-destructive/5'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold tabular-nums ${changed ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                      {displayCurrent}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {displayMax}</span>
                  </div>
                  <div className="mt-1">
                    {item.ok ? (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Đạt
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] bg-destructive/15 text-destructive border-none">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Vượt
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {preview.hasSelection && (
            <div className={`mt-3 p-2.5 rounded-lg text-sm font-medium text-center ${preview.allOk ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
              {preview.allOk
                ? '✅ Sau khi xóa, tài khoản đủ điều kiện mở khóa!'
                : '⚠️ Chưa đủ — cần chọn xóa thêm để giảm xuống hạn mức Free'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace & Project list */}
      <div className="space-y-2">
        {wsInfos.map(ws => {
          const isWsSelected = selectedWs.has(ws.id);
          const isExpanded = expandedWs.has(ws.id);
          const someProjectsSelected = ws.projects.some(p => selectedProjects.has(p.id));

          return (
            <Card key={ws.id} className={isWsSelected ? 'border-destructive/30 bg-destructive/5' : ''}>
              <CardContent className="p-0">
                {/* Workspace row */}
                <div className="flex items-center gap-3 p-4">
                  <Checkbox
                    checked={isWsSelected}
                    onCheckedChange={() => toggleWs(ws.id)}
                  />
                  <button
                    onClick={() => toggleExpand(ws.id)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{ws.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ws.projectCount} project · {ws.memberCount} thành viên · {formatStorage(ws.storageMb)}
                    </div>
                  </div>
                  {isWsSelected && (
                    <Badge variant="destructive" className="text-[10px]">Sẽ xóa</Badge>
                  )}
                </div>

                {/* Projects list */}
                {isExpanded && ws.projects.length > 0 && (
                  <div className="border-t border-border">
                    {ws.projects.map(project => {
                      const isProjSelected = selectedProjects.has(project.id) || isWsSelected;
                      return (
                        <div
                          key={project.id}
                          className={`flex items-center gap-3 px-4 py-3 pl-16 border-b border-border last:border-b-0 ${isProjSelected ? 'bg-destructive/5' : ''}`}
                        >
                          <Checkbox
                            checked={isProjSelected}
                            disabled={isWsSelected}
                            onCheckedChange={() => toggleProject(project.id, ws.id)}
                          />
                          <FolderKanban className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{project.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {project.taskCount} task · {formatStorage(project.storageMb)}
                            </div>
                          </div>
                          {isProjSelected && !isWsSelected && (
                            <Badge variant="destructive" className="text-[10px]">Sẽ xóa</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isExpanded && ws.projects.length === 0 && (
                  <div className="border-t border-border px-4 py-3 pl-16 text-xs text-muted-foreground">
                    Không có project nào
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action bar */}
      {preview.hasSelection && (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="text-sm">
            <span className="text-muted-foreground">Sẽ xóa: </span>
            <span className="font-medium">
              {preview.removedWs > 0 && `${preview.removedWs} workspace, `}
              {preview.removedProjects} project
              {preview.removedStorageMb > 0 && ` (${formatStorage(preview.removedStorageMb)})`}
            </span>
          </div>
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa đã chọn
          </Button>
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Xác nhận xóa vĩnh viễn
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Bạn sắp xóa vĩnh viễn các mục sau:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {Array.from(selectedWs).map(wsId => {
                    const ws = wsInfos.find(w => w.id === wsId);
                    return ws && (
                      <li key={wsId}>
                        <strong>Workspace "{ws.name}"</strong> ({ws.projectCount} project, {formatStorage(ws.storageMb)})
                      </li>
                    );
                  })}
                  {Array.from(selectedProjects)
                    .filter(pId => !Array.from(selectedWs).some(wsId => wsInfos.find(w => w.id === wsId)?.projects.some(p => p.id === pId)))
                    .map(pId => {
                      const project = wsInfos.flatMap(w => w.projects).find(p => p.id === pId);
                      return project && (
                        <li key={pId}>
                          Project "{project.name}" ({project.taskCount} task, {formatStorage(project.storageMb)})
                        </li>
                      );
                    })}
                </ul>
                <p className="text-destructive font-medium">Hành động này không thể hoàn tác!</p>
                <div>
                  <label className="text-sm font-medium">Nhập <strong>XÁC NHẬN</strong> để tiếp tục:</label>
                  <Input
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="XÁC NHẬN"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmText !== 'XÁC NHẬN' || deleting}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
