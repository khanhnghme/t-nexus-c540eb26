import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { Loader2, Video, Calendar, Clock, Layers, Link2, AlertTriangle } from 'lucide-react';
import { DeadlineHourPicker } from '@/components/DeadlineHourPicker';
import type { Stage, GroupMember } from '@/types/database';
import { useReadOnlyGuard } from '@/components/ReadOnlyGuard';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useLanguage } from '@/contexts/LanguageContext';

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  stages: Stage[];
  members: GroupMember[];
  onCreated: () => void;
}

export default function CreateMeetingDialog({
  open, onOpenChange, groupId, groupName, stages, members, onCreated
}: CreateMeetingDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { translations: t } = useLanguage();
  const planLimits = usePlanLimits();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [stageId, setStageId] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { guardAction: guardReadOnly } = useReadOnlyGuard();

  const maxDuration = planLimits.maxMeetingDurationMinutes;
  const allDurationOptions = [15, 30, 45, 60, 90, 120];
  const filteredDurationOptions = useMemo(() => {
    if (maxDuration === null) return allDurationOptions;
    return allDurationOptions.filter(m => m <= maxDuration);
  }, [maxDuration]);

  // Auto-correct if current selection exceeds limit
  useState(() => {
    if (maxDuration !== null && durationMinutes > maxDuration && filteredDurationOptions.length > 0) {
      setDurationMinutes(filteredDurationOptions[filteredDurationOptions.length - 1]);
    }
  });

  const handleCreate = async () => {
    if (guardReadOnly()) return;
    if (!title.trim() || !scheduledAt) return;
    setIsCreating(true);

    try {
      const roomName = `teamwork-${groupId.substring(0, 8)}-${Date.now().toString(36)}`;

      // 1. Create a task for this meeting (auto-assign all members)
      const { data: newTask, error: taskError } = await supabase.from('tasks').insert({
        group_id: groupId,
        title: `Họp: ${title.trim()}`,
        description: `Cuộc họp nhóm - ${description.trim() || 'Không có mô tả'}`,
        deadline: scheduledAt,
        stage_id: stageId || null,
        created_by: user!.id,
        status: 'TODO',
        slug: '',
      }).select().single();

      if (taskError) throw taskError;

      // 2. Assign all members to the task
      if (newTask && members.length > 0) {
        await supabase.from('task_assignments').insert(
          members.map(m => ({ task_id: newTask.id, user_id: m.user_id }))
        );
      }

      // 3. Create the meeting
      const { data: meeting, error: meetingError } = await (supabase.from('meetings') as any).insert({
        group_id: groupId,
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes,
        jitsi_room_name: roomName,
        external_link: externalLink.trim(),
        task_id: newTask?.id || null,
        created_by: user!.id,
      }).select().single();

      if (meetingError) throw meetingError;

      // 4. Create attendance records for all members
      if (meeting && members.length > 0) {
        await (supabase.from('meeting_attendance') as any).insert(
          members.map(m => ({
            meeting_id: meeting.id,
            user_id: m.user_id,
            status: 'absent',
          }))
        );
      }

      // 5. Log activity
      await logActivity({
        userId: user!.id,
        userName: profile?.full_name || user?.email || 'Unknown',
        action: 'CREATE_MEETING',
        actionType: 'task',
        description: `Tạo cuộc họp "${title.trim()}" lúc ${new Date(scheduledAt).toLocaleString('vi-VN')}`,
        groupId,
      });

      toast({ title: 'Thành công', description: 'Đã tạo cuộc họp và task tương ứng' });
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setScheduledAt('');
    setDurationMinutes(60);
    setStageId('');
    setExternalLink('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle>Tạo cuộc họp mới</DialogTitle>
              <DialogDescription>Cuộc họp sẽ tự động tạo task và gán tất cả thành viên</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              Tên cuộc họp <span className="text-destructive">*</span>
            </Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Họp sprint review tuần 5" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Link phòng họp (tuỳ chọn)
            </Label>
            <Input
              value={externalLink}
              onChange={e => setExternalLink(e.target.value)}
              placeholder="Để trống để dùng phòng họp tích hợp (JaaS)"
            />
            <p className="text-[11px] text-muted-foreground">Để trống → dùng phòng họp nhúng trực tiếp trong app. Hoặc nhập link Google Meet, Zoom...</p>
          </div>

          <div className="space-y-2">
            <Label>Mô tả / Agenda</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Nội dung cuộc họp..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Thời gian họp <span className="text-destructive">*</span>
              </Label>
              <DeadlineHourPicker value={scheduledAt} onChange={setScheduledAt} placeholder="Chọn thời gian..." />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Thời lượng (phút)
              </Label>
              <Select value={String(durationMinutes)} onValueChange={v => setDurationMinutes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filteredDurationOptions.map(mins => (
                    <SelectItem key={mins} value={String(mins)}>{mins} phút</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {maxDuration !== null && (
                <div className="flex items-start gap-1.5 mt-1.5 p-2 rounded-md bg-warning/10 border border-warning/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                  <p className="text-[11px] text-warning">
                    {(t as any).meeting?.durationLimitWarning
                      ? (t as any).meeting.durationLimitWarning.replace('{limit}', String(maxDuration))
                      : `Gói hiện tại giới hạn tối đa ${maxDuration} phút/cuộc họp.`}
                    {' '}
                    <a href="/upgrade" className="underline font-medium hover:text-warning/80">
                      {(t as any).meeting?.upgradeCta || 'Nâng cấp'}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>

          {stages.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Giai đoạn (để tính điểm)
              </Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue placeholder="Chọn giai đoạn..." /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-sm text-muted-foreground">
            <p>📋 Task <strong>"Họp: {title || '...'}"</strong> sẽ được tạo tự động</p>
            <p>👥 Tất cả {members.length} thành viên sẽ được gán vào task</p>
            <p>🎥 {externalLink.trim() ? 'Thành viên sẽ tham gia qua link phòng họp bên ngoài' : 'Phòng họp video sẽ được nhúng trực tiếp trong app'}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleCreate} disabled={isCreating || !title.trim() || !scheduledAt}>
            {isCreating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Đang tạo...</> : 'Tạo cuộc họp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
