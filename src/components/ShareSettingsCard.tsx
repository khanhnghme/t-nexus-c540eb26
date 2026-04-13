import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { supabase } from '@/integrations/supabase/client';
import { Share2, Copy, ExternalLink, Users, Activity, Loader2, Lock, Unlock, Eye, FolderOpen, KeyRound, Layers, Trophy, ChevronDown, ChevronRight, RefreshCw, Download } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useReadOnlyGuard } from '@/components/ReadOnlyGuard';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

interface ShareSettingsCardProps {
  groupId: string;
  groupSlug: string | null;
  groupName?: string;
  isPublic: boolean;
  shareToken: string | null;
  showMembersPublic: boolean;
  showActivityPublic: boolean;
  showResourcesPublic?: boolean;
  showTasksPublic?: boolean;
  showScoresPublic?: boolean;
  joinCode?: string | null;
  allowJoinByCode?: boolean;
  joinMemberLimit?: number | null;
  joinRequireApproval?: boolean;
  onUpdate: () => void;
}

// generateToken removed — now using project slug as share_token

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function ShareSettingsCard({
  groupId,
  groupSlug,
  groupName,
  isPublic,
  shareToken,
  showMembersPublic,
  showActivityPublic,
  showResourcesPublic = true,
  showTasksPublic = true,
  showScoresPublic = false,
  joinCode,
  allowJoinByCode = false,
  joinMemberLimit = null,
  joinRequireApproval = true,
  onUpdate,
}: ShareSettingsCardProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localIsPublic, setLocalIsPublic] = useState(isPublic);
  const [localShareToken, setLocalShareToken] = useState(shareToken);
  const [localShowMembers, setLocalShowMembers] = useState(showMembersPublic);
  const [localShowActivity, setLocalShowActivity] = useState(showActivityPublic);
  const [localShowResources, setLocalShowResources] = useState(showResourcesPublic);
  const [localShowTasks, setLocalShowTasks] = useState(showTasksPublic);
  const [localShowScores, setLocalShowScores] = useState(showScoresPublic);
  const [localJoinCode, setLocalJoinCode] = useState(joinCode || null);
  const [localAllowJoin, setLocalAllowJoin] = useState(allowJoinByCode);
  const [localMemberLimit, setLocalMemberLimit] = useState<number | null>(joinMemberLimit);
  const [localRequireApproval, setLocalRequireApproval] = useState(joinRequireApproval);
  const memberLimitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalIsPublic(isPublic);
    setLocalShareToken(shareToken);
    setLocalShowMembers(showMembersPublic);
    setLocalShowActivity(showActivityPublic);
    setLocalShowResources(showResourcesPublic);
    setLocalShowTasks(showTasksPublic);
    setLocalShowScores(showScoresPublic);
    setLocalJoinCode(joinCode || null);
    setLocalAllowJoin(allowJoinByCode);
    setLocalMemberLimit(joinMemberLimit);
    setLocalRequireApproval(joinRequireApproval);
  }, [isPublic, shareToken, showMembersPublic, showActivityPublic, showResourcesPublic, showTasksPublic, showScoresPublic, joinCode, allowJoinByCode, joinMemberLimit, joinRequireApproval]);

  const publicLink = localIsPublic && groupSlug
    ? `${window.location.origin}/project/${groupSlug}` 
    : null;

  const { guardAction: guardReadOnly } = useReadOnlyGuard();

  const handleToggleShare = async (enabled: boolean) => {
    if (guardReadOnly()) return;
    setIsUpdating(true);
    try {
      // Use slug as share_token for clean URLs
      const newToken = enabled ? (groupSlug || localShareToken) : null;
      const { error } = await supabase
        .from('groups')
        .update({ 
          is_public: enabled, 
          share_token: newToken,
          visibility: enabled ? 'public_link' : 'private',
        } as any)
        .eq('id', groupId);
      if (error) throw error;
      setLocalIsPublic(enabled);
      setLocalShareToken(newToken);
      toast({
        title: enabled ? 'Đã bật chia sẻ' : 'Đã tắt chia sẻ',
        description: enabled ? 'Link xem project đã được tạo' : 'Dự án đã chuyển về chế độ riêng tư',
      });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: enabled ? 'ENABLE_PUBLIC_SHARE' : 'DISABLE_PUBLIC_SHARE',
          actionType: 'setting',
          description: enabled ? 'Bật chia sẻ công khai dự án' : 'Tắt chia sẻ công khai — chuyển về riêng tư',
          groupId,
        });
      }
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  // handleRegenerateToken removed — slug-based links are permanent

  const handleUpdateVisibility = async (field: 'show_members_public' | 'show_activity_public' | 'show_resources_public' | 'show_tasks_public' | 'show_scores_public', value: boolean) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({ [field]: value } as any)
        .eq('id', groupId);
      if (error) throw error;
      if (field === 'show_members_public') setLocalShowMembers(value);
      else if (field === 'show_activity_public') setLocalShowActivity(value);
      else if (field === 'show_resources_public') setLocalShowResources(value);
      else if (field === 'show_tasks_public') setLocalShowTasks(value);
      else if (field === 'show_scores_public') setLocalShowScores(value);
      toast({ title: 'Đã cập nhật' });
      if (user && profile) {
        const fieldLabels: Record<string, string> = {
          show_members_public: 'Hiển thị thành viên công khai',
          show_activity_public: 'Hiển thị nhật ký công khai',
          show_resources_public: 'Hiển thị tài nguyên công khai',
          show_tasks_public: 'Hiển thị task công khai',
          show_scores_public: 'Hiển thị điểm thành viên công khai',
        };
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'UPDATE_SHARE_VISIBILITY', actionType: 'setting',
          description: `${value ? 'Bật' : 'Tắt'} ${fieldLabels[field] || field}`,
          groupId,
        });
      }
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleJoinCode = async (enabled: boolean) => {
    if (guardReadOnly()) return;
    setIsUpdating(true);
    try {
      let newCode = localJoinCode;
      if (enabled && !newCode) newCode = generateJoinCode();
      const { error } = await supabase
        .from('groups')
        .update({ allow_join_by_code: enabled, join_code: enabled ? newCode : null })
        .eq('id', groupId);
      if (error) throw error;
      setLocalAllowJoin(enabled);
      setLocalJoinCode(enabled ? newCode : null);
      toast({
        title: enabled ? 'Đã bật mã tham gia' : 'Đã tắt mã tham gia',
        description: enabled ? `Mã tham gia: ${newCode}` : 'Thành viên không thể tự tham gia bằng mã nữa',
      });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: enabled ? 'ENABLE_JOIN_CODE' : 'DISABLE_JOIN_CODE',
          actionType: 'setting',
          description: enabled ? `Bật mã tham gia project: ${newCode}` : 'Tắt mã tham gia project',
          groupId,
        });
      }
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerateJoinCode = async () => {
    setIsUpdating(true);
    try {
      const newCode = generateJoinCode();
      const { error } = await supabase
        .from('groups')
        .update({ join_code: newCode })
        .eq('id', groupId);
      if (error) throw error;
      setLocalJoinCode(newCode);
      toast({ title: 'Đã tạo mã mới', description: `Mã mới: ${newCode}` });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'REGENERATE_JOIN_CODE', actionType: 'setting',
          description: `Tạo lại mã tham gia mới: ${newCode}`,
          groupId,
        });
      }
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const copyLink = () => {
    if (publicLink) {
      navigator.clipboard.writeText(publicLink);
      toast({ title: 'Đã sao chép link' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Card 1: Public Share Link */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10">
                <Share2 className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base">Chia sẻ công khai</CardTitle>
            </div>
            <Switch
              checked={localIsPublic}
              onCheckedChange={handleToggleShare}
              disabled={isUpdating}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {localIsPublic ? (
            <>
              <div className="flex gap-1.5">
                <Input
                  value={publicLink || '...'}
                  readOnly
                  className="flex-1 bg-muted/50 font-mono text-xs h-9"
                />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={copyLink} disabled={!publicLink} title="Sao chép">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => publicLink && window.open(publicLink, '_blank')} disabled={!publicLink} title="Mở">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Hiển thị công khai
                  </p>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 p-3 pt-2">
                    {[
                      { icon: Layers, label: 'Task & Giai đoạn', checked: localShowTasks, field: 'show_tasks_public' as const },
                      { icon: Users, label: 'Thành viên', checked: localShowMembers, field: 'show_members_public' as const },
                      { icon: Trophy, label: 'Điểm thành viên', checked: localShowScores, field: 'show_scores_public' as const },
                      { icon: FolderOpen, label: 'Tài nguyên', checked: localShowResources, field: 'show_resources_public' as const },
                      { icon: Activity, label: 'Nhật ký', checked: localShowActivity, field: 'show_activity_public' as const },
                    ].map(({ icon: Icon, label, checked, field }) => (
                      <div key={field} className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {label}
                        </span>
                        <Switch
                          checked={checked}
                          onCheckedChange={(v) => handleUpdateVisibility(field, v)}
                        />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Eye className="w-3 h-3 shrink-0" />
                Chế độ chỉ xem – không thể chỉnh sửa
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Bật để tạo link cho người ngoài xem tiến độ project
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Join Code */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-accent/10">
                <KeyRound className="w-4 h-4 text-accent" />
              </div>
              <CardTitle className="text-base">Mã tham gia</CardTitle>
            </div>
            <Switch
              checked={localAllowJoin}
              onCheckedChange={handleToggleJoinCode}
              disabled={isUpdating}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {localAllowJoin && localJoinCode ? (
            <>
              <div className="flex gap-2 items-center">
                <div className="flex-1 bg-muted/50 border rounded-lg px-4 py-3 text-center text-3xl font-bold tracking-[0.5em] font-mono select-all">
                  {localJoinCode}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      const inviteText = [
                        `🎯 Bạn được mời tham gia dự án${groupName ? ` "${groupName}"` : ''}!`,
                        ``,
                        `📋 Mã tham gia: ${localJoinCode}`,
                        ``,
                        `👉 Cách tham gia:`,
                        `1. Truy cập ứng dụng`,
                        `2. Nhấn "Tham gia bằng mã"`,
                        `3. Nhập mã: ${localJoinCode}`,
                      ].join('\n');
                      navigator.clipboard.writeText(inviteText);
                      toast({ title: 'Đã sao chép mã kèm lời mời' });
                    }}
                    title="Sao chép mã"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleRegenerateJoinCode}
                    title="Tạo mã mới"
                    disabled={isUpdating}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              {/* Collapsible sub-settings */}
              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Tùy chọn nâng cao
                  </p>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 p-3 pt-2">
                    {/* Require approval toggle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          Cần duyệt khi tham gia bằng mã
                        </Label>
                        <Switch
                          checked={localRequireApproval}
                          onCheckedChange={async (checked) => {
                            setLocalRequireApproval(checked);
                            try {
                              const { error } = await supabase
                                .from('groups')
                                .update({ join_require_approval: checked } as any)
                                .eq('id', groupId);
                              if (error) throw error;
                              toast({ title: checked ? 'Đã bật yêu cầu duyệt' : 'Đã tắt yêu cầu duyệt' });
                              onUpdate();
                            } catch (e: any) {
                              toast({ title: 'Lỗi', description: e.message, variant: 'destructive' });
                            }
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {localRequireApproval
                          ? 'Thành viên nhập mã sẽ cần trưởng nhóm duyệt trước khi được vào project'
                          : 'Thành viên nhập mã sẽ được vào project ngay lập tức'
                        }
                      </p>
                    </div>
                    {/* Member limit setting */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Giới hạn thành viên
                        </Label>
                        <Switch
                          checked={localMemberLimit !== null}
                          onCheckedChange={async (checked) => {
                            const newLimit = checked ? 10 : null;
                            setLocalMemberLimit(newLimit);
                            try {
                              const { error } = await supabase
                                .from('groups')
                                .update({ join_member_limit: newLimit } as any)
                                .eq('id', groupId);
                              if (error) throw error;
                              toast({ title: checked ? 'Đã bật giới hạn thành viên' : 'Đã tắt giới hạn' });
                              onUpdate();
                            } catch (e: any) {
                              toast({ title: 'Lỗi', description: e.message, variant: 'destructive' });
                            }
                          }}
                        />
                      </div>
                      {localMemberLimit !== null && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={999}
                            value={localMemberLimit}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setLocalMemberLimit(val);
                              if (memberLimitTimeoutRef.current) clearTimeout(memberLimitTimeoutRef.current);
                              memberLimitTimeoutRef.current = setTimeout(async () => {
                                try {
                                  const { error } = await supabase
                                    .from('groups')
                                    .update({ join_member_limit: val } as any)
                                    .eq('id', groupId);
                                  if (error) throw error;
                                  toast({ title: 'Đã lưu giới hạn', description: `Tối đa ${val} thành viên` });
                                  onUpdate();
                                } catch (err: any) {
                                  toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
                                }
                              }, 800);
                            }}
                            className="h-8 w-20 text-center text-sm"
                          />
                          <span className="text-xs text-muted-foreground">người tối đa</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <p className="text-xs text-muted-foreground">
                Chia sẻ mã 6 ký tự này cho thành viên muốn tự tham gia project
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Bật để tạo mã 6 ký tự cho thành viên tự tham gia
            </p>
          )}
        </CardContent>
      </Card>

      {isUpdating && (
        <div className="col-span-full flex items-center justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
