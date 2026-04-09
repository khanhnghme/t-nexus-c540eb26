import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Download, Loader2, ChevronDown, Filter, Lock, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportProjectEvidencePdf, ExportData, ExportOptions } from '@/lib/projectEvidencePdf';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useNavigate } from 'react-router-dom';
import type { Group, GroupMember, Task, Stage } from '@/types/database';

interface ProjectEvidenceExportProps {
  groupId: string;
  project: Group;
}

export default function ProjectEvidenceExport({ groupId, project }: ProjectEvidenceExportProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canExportData, isLoading: limitsLoading } = usePlanLimits();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Default: export all
  const [options, setOptions] = useState<ExportOptions>({
    includeMembers: true,
    includeTasks: true,
    includeScores: true,
    includeResources: true,
    includeLogs: true,
    includeMeetings: true,
    includeSubmissions: true,
  });

  const handleOptionChange = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setOptions({
      includeMembers: true,
      includeTasks: true,
      includeScores: true,
      includeResources: true,
      includeLogs: true,
      includeMeetings: true,
      includeSubmissions: true,
    });
  };

  const deselectAll = () => {
    setOptions({
      includeMembers: false,
      includeTasks: false,
      includeScores: false,
      includeResources: false,
      includeLogs: false,
      includeMeetings: false,
      includeSubmissions: false,
    });
  };

  const handleExport = async () => {
    // Validate at least one option selected
    const hasSelection = Object.values(options).some(v => v);
    if (!hasSelection) {
      toast({
        title: 'Chưa chọn nội dung',
        description: 'Vui lòng chọn ít nhất một mục để xuất',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      // Fetch all data in parallel
      setProgressMessage('Đang tải dữ liệu cơ bản...');
      setProgress(10);

      const [
        { data: membersData },
        { data: stagesData },
        { data: tasksData },
      ] = await Promise.all([
        supabase.from('group_members').select('*').eq('group_id', groupId),
        supabase.from('stages').select('*').eq('group_id', groupId).order('order_index'),
        supabase.from('tasks').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
      ]);

      setProgress(25);

      // Fetch profiles for members
      let members: GroupMember[] = [];
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds);
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        members = membersData.map(m => ({ ...m, profiles: profilesMap.get(m.user_id) })) as GroupMember[];
      }

      setProgress(35);

      // Fetch task assignments
      let tasks: Task[] = [];
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: assignmentsData } = await supabase.from('task_assignments').select('*').in('task_id', taskIds);
        const assigneeIds = [...new Set(assignmentsData?.map(a => a.user_id) || [])];
        const { data: assigneeProfiles } = await supabase.from('profiles').select('*').in('id', assigneeIds.length > 0 ? assigneeIds : ['none']);
        const profilesMap = new Map(assigneeProfiles?.map(p => [p.id, p]) || []);
        tasks = tasksData.map(task => ({
          ...task,
          task_assignments: assignmentsData?.filter(a => a.task_id === task.id).map(a => ({ ...a, profiles: profilesMap.get(a.user_id) })) || [],
        })) as Task[];
      }

      setProgress(45);
      setProgressMessage('Đang tải điểm số chi tiết...');

      // Fetch scores
      let taskScores: any[] = [];
      let stageScores: any[] = [];
      let finalScores: any[] = [];
      let scoreAppeals: any[] = [];

      if (options.includeScores) {
        const taskIds = tasks.map(t => t.id);
        const stageIds = (stagesData || []).map(s => s.id);

        const [
          { data: taskScoresData },
          { data: stageScoresData },
          { data: finalScoresData },
          { data: scoreAppealsData },
        ] = await Promise.all([
          taskIds.length > 0 
            ? supabase.from('task_scores').select('*').in('task_id', taskIds)
            : Promise.resolve({ data: [] }),
          stageIds.length > 0 
            ? supabase.from('member_stage_scores').select('*').in('stage_id', stageIds)
            : Promise.resolve({ data: [] }),
          supabase.from('member_final_scores').select('*').eq('group_id', groupId),
          supabase.from('score_appeals').select('*'),
        ]);

        taskScores = taskScoresData || [];
        stageScores = stageScoresData || [];
        finalScores = finalScoresData || [];
        
        // Filter appeals relevant to this project
        const taskScoreIds = taskScores.map(ts => ts.id);
        const stageScoreIds = stageScores.map(ss => ss.id);
        scoreAppeals = (scoreAppealsData || []).filter(a => 
          (a.task_score_id && taskScoreIds.includes(a.task_score_id)) ||
          (a.stage_score_id && stageScoreIds.includes(a.stage_score_id))
        );
      }

      setProgress(55);
      setProgressMessage('Đang tải cuộc họp & nộp bài...');

      // Fetch meetings, submissions, stage weights, resources, logs in parallel
      let meetingsData: any[] = [];
      let meetingAttendanceData: any[] = [];
      let submissionsData: any[] = [];
      let stageWeightsData: any[] = [];
      let resources: any[] = [];
      let activityLogs: any[] = [];

      const taskIds = tasks.map(t => t.id);
      const stageIds = (stagesData || []).map((s: any) => s.id);

      const parallelFetches = await Promise.all([
        options.includeMeetings
          ? supabase.from('meetings').select('*').eq('group_id', groupId).order('scheduled_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        options.includeSubmissions && taskIds.length > 0
          ? supabase.from('submission_history').select('*').in('task_id', taskIds).order('submitted_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        options.includeScores && stageIds.length > 0
          ? supabase.from('stage_weights').select('*').eq('group_id', groupId)
          : Promise.resolve({ data: [] }),
        options.includeResources
          ? supabase.from('project_resources').select('*').eq('group_id', groupId).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        options.includeLogs
          ? supabase.from('activity_logs').select('*').eq('group_id', groupId).order('created_at', { ascending: false }).limit(500)
          : Promise.resolve({ data: [] }),
      ]);

      meetingsData = parallelFetches[0].data || [];
      submissionsData = parallelFetches[1].data || [];
      stageWeightsData = parallelFetches[2].data || [];
      resources = parallelFetches[3].data || [];
      activityLogs = parallelFetches[4].data || [];

      setProgress(70);

      // Fetch meeting attendance if meetings exist
      if (options.includeMeetings && meetingsData.length > 0) {
        const meetingIds = meetingsData.map((m: any) => m.id);
        const { data: attendanceData } = await supabase
          .from('meeting_attendance')
          .select('*')
          .in('meeting_id', meetingIds);
        meetingAttendanceData = attendanceData || [];
      }

      setProgress(85);
      setProgressMessage('Đang tạo PDF...');

      // Generate PDF
      const exportData: ExportData = {
        project: project as Group,
        members,
        stages: (stagesData || []) as Stage[],
        tasks,
        taskScores,
        stageScores,
        finalScores,
        scoreAppeals,
        resources,
        activityLogs,
        meetings: meetingsData,
        meetingAttendance: meetingAttendanceData,
        submissions: submissionsData,
        stageWeights: stageWeightsData,
        options,
      };

      const fileName = await exportProjectEvidencePdf(exportData);

      setProgress(100);
      setProgressMessage('Hoàn tất!');

      toast({
        title: 'Xuất PDF thành công',
        description: `File ${fileName} đã được tải xuống`,
      });

    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Lỗi xuất PDF',
        description: error.message || 'Không thể xuất báo cáo minh chứng',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const optionItems = [
    { key: 'includeMembers' as const, label: 'Thành viên' },
    { key: 'includeTasks' as const, label: 'Công việc' },
    { key: 'includeScores' as const, label: 'Điểm quá trình' },
    { key: 'includeMeetings' as const, label: 'Cuộc họp' },
    { key: 'includeSubmissions' as const, label: 'Nộp bài' },
    { key: 'includeResources' as const, label: 'Tài nguyên' },
    { key: 'includeLogs' as const, label: 'Nhật ký' },
  ];

  const selectedCount = Object.values(options).filter(v => v).length;

  if (!canExportData && !limitsLoading) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-amber-500" />
            Xuất Minh chứng
          </CardTitle>
          <CardDescription className="text-xs">
            Tính năng xuất dữ liệu chỉ dành cho gói Plus trở lên
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate('/pricing')}>
            <ArrowUpRight className="w-4 h-4" />
            Nâng cấp để xuất dữ liệu
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary text-base">
          <FileText className="w-4 h-4" />
          Xuất Minh chứng
        </CardTitle>
        <CardDescription className="text-xs">
          Xuất báo cáo PDF đầy đủ với logo ETT và mục lục
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Compact filter section */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3 h-3" />
                Lọc nội dung ({selectedCount}/7)
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2 p-2 bg-muted/50 rounded-md">
              <div className="flex gap-2 mb-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAll}>
                  Chọn tất cả
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={deselectAll}>
                  Bỏ chọn
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {optionItems.map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={options[key]}
                      onCheckedChange={() => handleOptionChange(key)}
                      disabled={isExporting}
                      className="h-3.5 w-3.5"
                    />
                    <Label
                      htmlFor={key}
                      className="text-xs font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Progress bar */}
        {isExporting && (
          <div className="space-y-1.5">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground text-center">
              {progressMessage}
            </p>
          </div>
        )}

        {/* Export button */}
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-primary hover:bg-primary/90 h-9"
          size="sm"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Đang xuất...
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Xuất toàn bộ PDF
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
