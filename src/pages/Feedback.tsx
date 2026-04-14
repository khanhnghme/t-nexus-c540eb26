import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import UserAvatar from '@/components/UserAvatar';
import SystemErrorLogs from '@/components/SystemErrorLogs';
import { r2Storage } from '@/lib/r2Storage';
import { normalizeStorageUrl } from '@/lib/r2Storage';
import {
  Send,
  Loader2,
  Lightbulb,
  Clock,
  Bug,
  CheckCircle2,
  CircleDot,
  MessageSquareText,
  Filter,
  MessageSquarePlus,
  Paperclip,
  ChevronRight,
  X,
  Mail,
  FileText,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type FeedbackType = 'bug' | 'suggestion' | 'other';
type FeedbackStatus = 'pending' | 'reviewed' | 'resolved';

interface FeedbackItem {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  priority: string;
  admin_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  attachments?: string[];
  // joined from profiles
  user_name?: string;
  user_avatar_url?: string | null;
  user_plan?: string;
  user_email?: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  bug: { label: 'Lỗi', color: 'bg-destructive/15 text-destructive border-destructive/20' },
  suggestion: { label: 'Đề xuất', color: 'bg-primary/15 text-primary border-primary/20' },
  other: { label: 'Khác', color: 'bg-muted text-muted-foreground border-border' },
  general: { label: 'Chung', color: 'bg-muted text-muted-foreground border-border' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CircleDot; color: string }> = {
  pending: { label: 'Chờ xử lý', icon: CircleDot, color: 'text-warning' },
  reviewed: { label: 'Đã xem', icon: MessageSquareText, color: 'text-primary' },
  resolved: { label: 'Đã xử lý', icon: CheckCircle2, color: 'text-emerald-500' },
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  plan_free: { label: 'Free', color: 'bg-muted text-muted-foreground' },
  plan_plus: { label: 'Plus', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  plan_pro: { label: 'Pro', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  plan_business: { label: 'Business', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  plan_custom: { label: 'Custom', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
};

const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function FeedbackPage() {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<FeedbackType>('suggestion');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Admin filters
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Admin response dialog
  const [respondingTo, setRespondingTo] = useState<FeedbackItem | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [adminStatus, setAdminStatus] = useState<FeedbackStatus>('reviewed');
  const [isSaving, setIsSaving] = useState(false);

  // File/image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Detail dialog
  const [viewingFeedback, setViewingFeedback] = useState<FeedbackItem | null>(null);

  useEffect(() => {
    fetchFeedbacks();
  }, [user, isAdmin]);

  const fetchFeedbacks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(f => f.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, user_plan, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        setFeedbacks(data.map(f => ({
          ...f,
          attachments: Array.isArray(f.attachments) ? f.attachments as string[] : [],
          user_name: profileMap.get(f.user_id)?.full_name || 'Unknown',
          user_avatar_url: profileMap.get(f.user_id)?.avatar_url || null,
          user_plan: profileMap.get(f.user_id)?.user_plan || 'plan_free',
          user_email: profileMap.get(f.user_id)?.email || '',
        })));
      } else {
        setFeedbacks([]);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: 'Lỗi', description: `"${file.name}" vượt quá ${MAX_FILE_SIZE_MB}MB`, variant: 'destructive' });
        return;
      }
    }

    setAttachedFiles(prev => {
      const combined = [...prev, ...files];
      if (combined.length > MAX_FILES) {
        toast({ title: 'Lỗi', description: `Tối đa ${MAX_FILES} file`, variant: 'destructive' });
        return prev;
      }
      return combined;
    });
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachedFiles.length === 0) return [];
    const urls: string[] = [];

    for (const file of attachedFiles) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user!.id}/${timestamp}-${safeName}`;

      const { data, error } = await r2Storage.from('feedback-attachments').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        throw new Error(`Upload thất bại: ${(error as any).message}`);
      }

      const { data: urlData } = r2Storage.from('feedback-attachments').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }

    return urls;
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tiêu đề và nội dung', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const attachmentUrls = await uploadAttachments();

      const { error } = await supabase.from('feedbacks').insert([{
        user_id: user!.id,
        title: newTitle.trim(),
        content: newContent.trim(),
        type: newType,
        attachments: attachmentUrls,
      }]);
      if (error) throw error;
      toast({ title: 'Thành công', description: 'Góp ý đã được gửi đến quản trị viên' });
      setNewTitle('');
      setNewContent('');
      setNewType('suggestion');
      setAttachedFiles([]);
      fetchFeedbacks();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message || 'Không thể gửi góp ý', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAdminRespond = async () => {
    if (!respondingTo) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({
          admin_response: adminResponse.trim() || null,
          responded_at: new Date().toISOString(),
          responded_by: user!.id,
          status: adminStatus,
        })
        .eq('id', respondingTo.id);
      if (error) throw error;
      toast({ title: 'Đã cập nhật phản hồi' });
      setRespondingTo(null);
      setAdminResponse('');
      fetchFeedbacks();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const openRespondDialog = (fb: FeedbackItem) => {
    setRespondingTo(fb);
    setAdminResponse(fb.admin_response || '');
    setAdminStatus((fb.status as FeedbackStatus) || 'reviewed');
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi });
  };

  // Filter for user: only own feedbacks
  const myFeedbacks = feedbacks.filter(f => f.user_id === user?.id);

  // Filter for admin
  const filteredFeedbacks = feedbacks.filter(f => {
    if (filterPlan !== 'all' && f.user_plan !== filterPlan) return false;
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterType !== 'all' && f.type !== filterType) return false;
    return true;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const PlanBadge = ({ plan }: { plan: string }) => {
    const config = PLAN_LABELS[plan] || PLAN_LABELS.plan_free;
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const isImageUrl = (url: string) => {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  };

  const getFileNameFromUrl = (url: string) => {
    const path = url.split('?')[0];
    const segments = path.split('/');
    const raw = segments[segments.length - 1] || 'file';
    // Remove timestamp prefix like "1234567890-"
    return raw.replace(/^\d+-/, '');
  };

  const Attachments = ({ urls }: { urls?: string[] }) => {
    if (!urls || urls.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {urls.map((url, i) => {
          const normalizedUrl = normalizeStorageUrl(url) || url;
          const isImg = isImageUrl(normalizedUrl);
          const fileName = getFileNameFromUrl(normalizedUrl);

          if (isImg) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => setPreviewImage(normalizedUrl)}
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
              >
                <img
                  src={normalizedUrl}
                  alt={`Đính kèm ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          }

          return (
            <a
              key={i}
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:border-primary transition-colors bg-muted/30 text-xs max-w-[200px]"
              title={fileName}
            >
              <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{fileName}</span>
              <Download className="w-3 h-3 shrink-0 text-muted-foreground" />
            </a>
          );
        })}
      </div>
    );
  };

  const FeedbackRow = ({ fb, showUser }: { fb: FeedbackItem; showUser?: boolean }) => {
    const typeConfig = TYPE_LABELS[fb.type] || TYPE_LABELS.other;
    const statusConfig = STATUS_CONFIG[fb.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;
    return (
      <button
        type="button"
        onClick={() => setViewingFeedback(fb)}
        className="w-full text-left group"
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm transition-all">
          {/* Status indicator dot */}
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            fb.status === 'pending' ? 'bg-warning' : 
            fb.status === 'reviewed' ? 'bg-primary' : 'bg-emerald-500'
          }`} />

          {showUser && (
            <UserAvatar src={fb.user_avatar_url} name={fb.user_name} size="sm" />
          )}

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{fb.title}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className={`text-[10px] leading-none px-1.5 py-0.5 ${typeConfig.color}`}>
                {typeConfig.label}
              </Badge>
              {showUser && (
                <>
                  <span className="truncate max-w-[100px]">{fb.user_name}</span>
                  {fb.user_plan && <PlanBadge plan={fb.user_plan} />}
                  <span className="text-border">·</span>
                </>
              )}
              <Clock className="w-3 h-3" />
              <span>{formatTime(fb.created_at)}</span>
              {fb.attachments && fb.attachments.length > 0 && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Paperclip className="w-3 h-3" />
                  {fb.attachments.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fb.admin_response && (
              <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5">
                <MessageSquareText className="w-3 h-3" />
                <span className="hidden sm:inline">Đã phản hồi</span>
              </div>
            )}
            <Badge variant="outline" className={`text-[10px] ${statusConfig.color} border-current/20`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-3">
          <Lightbulb className="w-8 h-8 text-warning" />
          Góp ý / Báo lỗi
        </h1>
        <p className="text-muted-foreground mt-1">
          Gửi góp ý riêng tư đến quản trị viên về hệ thống và quy trình làm việc
        </p>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span>Hoặc liên hệ qua email: </span>
          <a href="mailto:support@t-nexus.io.vn" className="text-primary hover:underline font-medium">
            support@t-nexus.io.vn
          </a>
        </div>
      </div>

      <Tabs defaultValue="submit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submit" className="gap-2">
            <MessageSquarePlus className="w-4 h-4" />
            Gửi góp ý
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2">
            <Clock className="w-4 h-4" />
            Góp ý của tôi
            {myFeedbacks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {myFeedbacks.length}
              </Badge>
            )}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="all" className="gap-2">
              <Filter className="w-4 h-4" />
              Tất cả góp ý
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="errors" className="gap-2">
              <Bug className="w-4 h-4" />
              Log lỗi
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Submit */}
        <TabsContent value="submit">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Loại góp ý</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as FeedbackType)}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">💡 Đề xuất cải tiến</SelectItem>
                    <SelectItem value="bug">🐛 Báo lỗi</SelectItem>
                    <SelectItem value="other">📝 Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tiêu đề <span className="text-destructive">*</span></Label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="VD: Đề xuất cải tiến giao diện quản lý task"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Nội dung chi tiết <span className="text-destructive">*</span></Label>
                <Textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Mô tả chi tiết góp ý của bạn..."
                  className="min-h-[150px]"
                  maxLength={5000}
                />
              </div>

              {/* Image upload */}
              <div className="space-y-2">
                <Label>File đính kèm <span className="text-muted-foreground text-xs">(tối đa {MAX_FILES} file, {MAX_FILE_SIZE_MB}MB/file)</span></Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="flex flex-wrap gap-2 items-start">
                  {attachedFiles.map((file, i) => {
                    const isImage = file.type.startsWith('image/');
                    return (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                        {isImage ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 p-1">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 truncate">
                          {file.name}
                        </div>
                      </div>
                    );
                  })}
                  {attachedFiles.length < MAX_FILES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                    >
                      <Paperclip className="w-5 h-5" />
                      <span className="text-[10px]">Thêm file</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Góp ý sẽ được gửi riêng tư đến quản trị viên
                </p>
                <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Gửi góp ý
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: My feedbacks */}
        <TabsContent value="my" className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : myFeedbacks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Bạn chưa gửi góp ý nào</p>
              </CardContent>
            </Card>
          ) : (
            myFeedbacks.map(fb => <FeedbackRow key={fb.id} fb={fb} />)
          )}
        </TabsContent>

        {/* Tab: Admin - All feedbacks */}
        {isAdmin && (
          <TabsContent value="all" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Gói plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả gói</SelectItem>
                  <SelectItem value="plan_free">Free</SelectItem>
                  <SelectItem value="plan_plus">Plus</SelectItem>
                  <SelectItem value="plan_pro">Pro</SelectItem>
                  <SelectItem value="plan_business">Business</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="reviewed">Đã xem</SelectItem>
                  <SelectItem value="resolved">Đã xử lý</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="bug">Lỗi</SelectItem>
                  <SelectItem value="suggestion">Đề xuất</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center text-sm text-muted-foreground ml-auto">
                {filteredFeedbacks.length} góp ý
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredFeedbacks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Không có góp ý nào phù hợp bộ lọc</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredFeedbacks.map(fb => <FeedbackRow key={fb.id} fb={fb} showUser />)}
              </div>
            )}
          </TabsContent>
        )}

        {/* Tab: Error logs */}
        {isAdmin && (
          <TabsContent value="errors">
            <SystemErrorLogs />
          </TabsContent>
        )}
      </Tabs>

      {/* Feedback detail dialog */}
      <Dialog open={!!viewingFeedback} onOpenChange={(open) => !open && setViewingFeedback(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" onCloseAutoFocus={e => e.preventDefault()}>
          {viewingFeedback && (() => {
            const fb = viewingFeedback;
            const typeConfig = TYPE_LABELS[fb.type] || TYPE_LABELS.other;
            const statusConfig = STATUS_CONFIG[fb.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            return (
              <>
                {/* Colored header strip */}
                <div className={`px-6 pt-6 pb-4 border-b bg-muted/30`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                          {typeConfig.label}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${statusConfig.color} border-current/20`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">{fb.title}</h2>
                    </div>
                  </div>

                  {/* User info row */}
                  <div className="flex items-center gap-2 mt-3">
                    <UserAvatar src={fb.user_avatar_url} name={fb.user_name || 'User'} size="sm" />
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium">{fb.user_name}</span>
                      {fb.user_plan && <PlanBadge plan={fb.user_plan} />}
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(fb.created_at)}
                    </span>
                  </div>
                </div>

                {/* Content body */}
                <div className="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{fb.content}</p>

                  {/* Attachments */}
                  {fb.attachments && fb.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Đính kèm</p>
                      <Attachments urls={fb.attachments} />
                    </div>
                  )}

                  {/* Admin response */}
                  {fb.admin_response && (
                    <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">Phản hồi từ quản trị viên</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed pl-6">{fb.admin_response}</p>
                      {fb.responded_at && (
                        <p className="text-[11px] text-muted-foreground pl-6">{formatTime(fb.responded_at)}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                {isAdmin && (
                  <div className="px-6 py-3 border-t bg-muted/20 flex justify-end">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setViewingFeedback(null);
                        openRespondDialog(fb);
                      }}
                    >
                      <MessageSquareText className="w-3.5 h-3.5" />
                      {fb.admin_response ? 'Sửa phản hồi' : 'Phản hồi'}
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Admin respond dialog */}
      <Dialog open={!!respondingTo} onOpenChange={(open) => !open && setRespondingTo(null)}>
        <DialogContent className="max-w-lg" onCloseAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Phản hồi góp ý</DialogTitle>
            <DialogDescription>
              {respondingTo?.title}
            </DialogDescription>
          </DialogHeader>

          {respondingTo?.attachments && respondingTo.attachments.length > 0 && (
            <Attachments urls={respondingTo.attachments} />
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={adminStatus} onValueChange={(v) => setAdminStatus(v as FeedbackStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="reviewed">Đã xem</SelectItem>
                  <SelectItem value="resolved">Đã xử lý</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phản hồi cho người dùng</Label>
              <Textarea
                value={adminResponse}
                onChange={e => setAdminResponse(e.target.value)}
                placeholder="Nhập phản hồi..."
                className="min-h-[100px]"
                maxLength={2000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondingTo(null)}>Hủy</Button>
            <Button onClick={handleAdminRespond} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Lưu phản hồi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
