import { useRef } from 'react';
import { useTaskAttachments } from '@/hooks/useTaskAttachments';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserAvatar from '@/components/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Download, Trash2, FileText, FileImage, FileArchive, File, Loader2, Paperclip } from 'lucide-react';
import { formatDateVN } from '@/lib/datetime';

interface TaskAttachmentsProps {
  taskId: string;
  canEdit: boolean;
  isLeader?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string | null, fileName: string) {
  const type = contentType || '';
  if (type.startsWith('image/')) return <FileImage className="w-4 h-4 text-primary" />;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return <FileText className="w-4 h-4 text-warning" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return <FileArchive className="w-4 h-4 text-muted-foreground" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

export default function TaskAttachments({ taskId, canEdit, isLeader }: TaskAttachmentsProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { attachments, isLoading, uploadAttachment, deleteAttachment, getSignedUrl, isUploading, isDeleting } = useTaskAttachments(taskId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAttachment(file);
      e.target.value = '';
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const url = await getSignedUrl(filePath);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.click();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            {t.taskAttachments?.title ?? 'Tệp đính kèm'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            {t.taskAttachments?.title ?? 'Tệp đính kèm'} ({attachments.length})
          </CardTitle>
          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {t.taskAttachments?.upload ?? 'Tải lên'}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t.taskAttachments?.noAttachments ?? 'Chưa có tệp đính kèm nào'}</p>
        ) : (
          <div className="space-y-2">
            {attachments.map(att => (
              <div key={att.id} className="flex items-center gap-3 p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors">
                {getFileIcon(att.content_type, att.file_name)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{att.file_name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatFileSize(att.file_size)}</span>
                    <span>•</span>
                    <span>{formatDateVN(att.created_at)}</span>
                    {att.uploader_name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <UserAvatar src={att.uploader_avatar} name={att.uploader_name} size="xs" />
                          {att.uploader_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDownload(att.file_path, att.file_name)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  {(att.user_id === user?.id || isLeader) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => deleteAttachment(att.id, att.file_path)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
