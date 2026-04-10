import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLogger';
import { cn } from '@/lib/utils';
import { useReadOnlyGuard } from '@/components/ReadOnlyGuard';
import { useGoogleDriveConnect } from '@/hooks/useGoogleDriveConnect';
import { useGoogleDrivePicker, DriveFile } from '@/hooks/useGoogleDrivePicker';
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  FileSpreadsheet,
  Presentation,
  Link as LinkIcon,
  FolderUp,
  Loader2,
  X,
  Pencil,
  Plus,
  Info,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  ExternalLink,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'general', label: 'Tài liệu chung', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'template', label: 'Mẫu/Template', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'reference', label: 'Tham khảo', color: 'bg-green-500/10 text-green-600 border-green-200' },
  { value: 'guide', label: 'Hướng dẫn', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { value: 'plugin', label: 'Plugin/Công cụ', color: 'bg-pink-500/10 text-pink-600 border-pink-200' },
];

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const cls = 'w-4 h-4';
  switch (ext) {
    case 'pdf': return <FileText className={cn(cls, 'text-red-500')} />;
    case 'doc': case 'docx': return <FileText className={cn(cls, 'text-blue-500')} />;
    case 'xls': case 'xlsx': case 'csv': return <FileSpreadsheet className={cn(cls, 'text-green-500')} />;
    case 'ppt': case 'pptx': return <Presentation className={cn(cls, 'text-orange-500')} />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return <ImageIcon className={cn(cls, 'text-purple-500')} />;
    case 'mp4': case 'webm': case 'mov': return <Video className={cn(cls, 'text-pink-500')} />;
    case 'mp3': case 'wav': return <Music className={cn(cls, 'text-cyan-500')} />;
    case 'zip': case 'rar': case '7z': return <Archive className={cn(cls, 'text-amber-500')} />;
    default: return <File className={cn(cls, 'text-muted-foreground')} />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface PendingFile {
  id: string;
  file: File;
  customName: string;
  category: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  source: 'file' | 'folder';
}

interface PendingLink {
  id: string;
  name: string;
  url: string;
  category: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface PendingDriveFile {
  id: string;
  driveFile: DriveFile;
  category: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface ResourceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  folderId: string | null;
  folderName?: string;
  onSuccess: () => void;
  onClose?: () => void;
}

export default function ResourceUploadDialog({
  open,
  onOpenChange,
  groupId,
  folderId,
  folderName,
  onSuccess,
  onClose,
}: ResourceUploadDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('file');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [pendingDriveFiles, setPendingDriveFiles] = useState<PendingDriveFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalCategory, setGlobalCategory] = useState('general');

  // Link form
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Google Drive
  const { isConnected: isDriveConnected, isChecking: isDriveChecking, connect: connectDrive, getPickerToken } = useGoogleDriveConnect();
  const { openPicker, isLoading: isPickerLoading } = useGoogleDrivePicker({
    getPickerToken,
    onFilesPicked: (files) => {
      const newItems: PendingDriveFile[] = files.map(f => ({
        id: genId(),
        driveFile: f,
        category: globalCategory,
        status: 'pending' as const,
      }));
      setPendingDriveFiles(prev => [...prev, ...newItems]);
    },
  });
  const genId = () => Math.random().toString(36).substring(2, 10);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: PendingFile[] = files
      .filter(f => f.size <= 50 * 1024 * 1024)
      .map(f => ({
        id: genId(),
        file: f,
        customName: f.name.substring(0, f.name.lastIndexOf('.')) || f.name,
        category: globalCategory,
        status: 'pending' as const,
        progress: 0,
        source: 'file' as const,
      }));

    const oversized = files.filter(f => f.size > 50 * 1024 * 1024);
    if (oversized.length > 0) {
      toast({ title: 'Cảnh báo', description: `${oversized.length} file vượt quá 50MB đã bị bỏ qua.`, variant: 'destructive' });
    }

    setPendingFiles(prev => [...prev, ...newItems]);
    if (e.target) e.target.value = '';
  };

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: PendingFile[] = files
      .filter(f => f.size <= 50 * 1024 * 1024)
      .map(f => ({
        id: genId(),
        file: f,
        customName: f.name.substring(0, f.name.lastIndexOf('.')) || f.name,
        category: globalCategory,
        status: 'pending' as const,
        progress: 0,
        source: 'folder' as const,
      }));

    const oversized = files.filter(f => f.size > 50 * 1024 * 1024);
    if (oversized.length > 0) {
      toast({ title: 'Cảnh báo', description: `${oversized.length} file vượt quá 50MB đã bị bỏ qua.`, variant: 'destructive' });
    }

    setPendingFiles(prev => [...prev, ...newItems]);
    if (e.target) e.target.value = '';
  };

  const addLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tên và URL', variant: 'destructive' });
      return;
    }
    setPendingLinks(prev => [...prev, {
      id: genId(),
      name: linkName.trim(),
      url: linkUrl.trim(),
      category: globalCategory,
      status: 'pending',
    }]);
    setLinkName('');
    setLinkUrl('');
  };

  const removeFile = (id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  const removeLink = (id: string) => {
    setPendingLinks(prev => prev.filter(l => l.id !== id));
  };

  const removeDriveFile = (id: string) => {
    setPendingDriveFiles(prev => prev.filter(d => d.id !== id));
  };

  const updateFileName = (id: string, name: string) => {
    setPendingFiles(prev => prev.map(f => f.id === id ? { ...f, customName: name } : f));
  };

  const updateFileCategory = (id: string, category: string) => {
    setPendingFiles(prev => prev.map(f => f.id === id ? { ...f, category } : f));
  };

  const updateLinkCategory = (id: string, category: string) => {
    setPendingLinks(prev => prev.map(l => l.id === id ? { ...l, category } : l));
  };

  const updateDriveFileCategory = (id: string, category: string) => {
    setPendingDriveFiles(prev => prev.map(d => d.id === id ? { ...d, category } : d));
  };

  const totalPending = pendingFiles.filter(f => f.status === 'pending').length + pendingLinks.filter(l => l.status === 'pending').length + pendingDriveFiles.filter(d => d.status === 'pending').length;
  const totalDone = pendingFiles.filter(f => f.status === 'done').length + pendingLinks.filter(l => l.status === 'done').length + pendingDriveFiles.filter(d => d.status === 'done').length;
  const totalItems = pendingFiles.length + pendingLinks.length + pendingDriveFiles.length;

  const { guardAction: guardReadOnly } = useReadOnlyGuard();

  const handleSubmitAll = async () => {
    if (guardReadOnly()) return;
    if (totalPending === 0) return;
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Chưa đăng nhập');

      // Group folder-source files by their root folder name
      const folderFiles = pendingFiles.filter(f => f.source === 'folder' && f.status === 'pending');
      const regularFiles = pendingFiles.filter(f => f.source === 'file' && f.status === 'pending');

      // Extract unique root folder names from webkitRelativePath
      const folderGroups = new Map<string, PendingFile[]>();
      for (const item of folderFiles) {
        const relativePath = item.file.webkitRelativePath;
        const rootFolderName = relativePath ? relativePath.split('/')[0] : null;
        if (rootFolderName) {
          if (!folderGroups.has(rootFolderName)) {
            folderGroups.set(rootFolderName, []);
          }
          folderGroups.get(rootFolderName)!.push(item);
        }
      }

      // Create folders and upload folder files
      for (const [folderName, files] of folderGroups) {
        // Create the resource_folder
        let targetFolderId = folderId;
        try {
          const { data: newFolder, error: folderError } = await (supabase
            .from('resource_folders')
            .insert({
              group_id: groupId,
              name: folderName,
              created_by: userData.user.id,
            } as any)
            .select('id')
            .single() as any);

          if (folderError) throw folderError;
          targetFolderId = newFolder.id;
        } catch (err: any) {
          // If folder creation fails, upload to current folder
          console.error('Failed to create folder:', err);
        }

        // Upload files into that folder
        for (const item of files) {
          setPendingFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f));

          try {
            const fileExt = item.file.name.split('.').pop();
            const storageName = `${groupId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await r2Storage
              .from('project-resources')
              .upload(storageName, item.file);

            if (uploadError) throw uploadError;

            setPendingFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 70 } : f));

            const finalFileName = item.customName.trim()
              ? `${item.customName.trim()}.${fileExt}`
              : item.file.name;

            const { error: insertError } = await (supabase
              .from('project_resources')
              .insert({
                group_id: groupId,
                name: finalFileName,
                file_path: uploadData?.publicUrl || '',
                storage_name: storageName,
                file_size: item.file.size,
                file_type: item.file.type,
                category: item.category,
                description: null,
                uploaded_by: userData.user.id,
                folder_id: targetFolderId,
                resource_type: 'file',
                link_url: null,
              } as any) as any);

            if (insertError) throw insertError;

            setPendingFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
          } catch (err: any) {
            setPendingFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: err.message } : f));
          }
        }
      }

      // Upload regular files (non-folder source)
      for (const item of regularFiles) {
        setPendingFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f));

        try {
          const fileExt = item.file.name.split('.').pop();
          const storageName = `${groupId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await r2Storage
            .from('project-resources')
            .upload(storageName, item.file);

          if (uploadError) throw uploadError;

          setPendingFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 70 } : f));

          const finalFileName = item.customName.trim()
            ? `${item.customName.trim()}.${fileExt}`
            : item.file.name;

          const { error: insertError } = await (supabase
            .from('project_resources')
            .insert({
              group_id: groupId,
              name: finalFileName,
              file_path: uploadData?.publicUrl || '',
              storage_name: storageName,
              file_size: item.file.size,
              file_type: item.file.type,
              category: item.category,
              description: null,
              uploaded_by: userData.user.id,
              folder_id: folderId,
              resource_type: 'file',
              link_url: null,
            } as any) as any);

          if (insertError) throw insertError;

          setPendingFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
        } catch (err: any) {
          setPendingFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: err.message } : f));
        }
      }

      // Upload links
      for (let i = 0; i < pendingLinks.length; i++) {
        const item = pendingLinks[i];
        if (item.status !== 'pending') continue;

        setPendingLinks(prev => prev.map(l => l.id === item.id ? { ...l, status: 'uploading' } : l));

        try {
          const { error: insertError } = await (supabase
            .from('project_resources')
            .insert({
              group_id: groupId,
              name: item.name,
              file_path: null,
              storage_name: null,
              file_size: 0,
              file_type: null,
              category: item.category,
              description: null,
              uploaded_by: userData.user.id,
              folder_id: folderId,
              resource_type: 'link',
              link_url: item.url,
            } as any) as any);

          if (insertError) throw insertError;

          setPendingLinks(prev => prev.map(l => l.id === item.id ? { ...l, status: 'done' } : l));
        } catch (err: any) {
          setPendingLinks(prev => prev.map(l => l.id === item.id ? { ...l, status: 'error', error: err.message } : l));
        }
      }

      // Save Drive files as link resources
      for (const item of pendingDriveFiles) {
        if (item.status !== 'pending') continue;
        setPendingDriveFiles(prev => prev.map(d => d.id === item.id ? { ...d, status: 'uploading' } : d));
        try {
          const { error: insertError } = await (supabase
            .from('project_resources')
            .insert({
              group_id: groupId,
              name: item.driveFile.title,
              file_path: null,
              storage_name: null,
              file_size: item.driveFile.file_size || 0,
              file_type: item.driveFile.mime_type,
              category: item.category,
              description: null,
              uploaded_by: userData.user.id,
              folder_id: folderId,
              resource_type: 'link',
              link_url: item.driveFile.url,
            } as any) as any);
          if (insertError) throw insertError;
          setPendingDriveFiles(prev => prev.map(d => d.id === item.id ? { ...d, status: 'done' } : d));
        } catch (err: any) {
          setPendingDriveFiles(prev => prev.map(d => d.id === item.id ? { ...d, status: 'error', error: err.message } : d));
        }
      }

      toast({ title: 'Hoàn tất', description: 'Đã xử lý tất cả tài nguyên' });

      // Log uploaded files and links
      const uploadedFiles = pendingFiles.filter(f => f.status === 'done');
      const uploadedLinks = pendingLinks.filter(l => l.status === 'done');
      const uploadedDrive = pendingDriveFiles.filter(d => d.status === 'done');
      const totalUploaded = uploadedFiles.length + uploadedLinks.length + uploadedDrive.length;
      if (totalUploaded > 0 && userData.user) {
        const descriptions: string[] = [];
        if (uploadedFiles.length > 0) {
          descriptions.push(`${uploadedFiles.length} file (${uploadedFiles.map(f => f.file.name).join(', ')})`);
        }
        if (uploadedLinks.length > 0) {
          descriptions.push(`${uploadedLinks.length} link (${uploadedLinks.map(l => l.name).join(', ')})`);
        }
        if (uploadedDrive.length > 0) {
          descriptions.push(`${uploadedDrive.length} file Drive (${uploadedDrive.map(d => d.driveFile.title).join(', ')})`);
        }
        await logActivity({
          userId: userData.user.id,
          userName: userData.user.user_metadata?.full_name || userData.user.email || 'Unknown',
          action: 'UPLOAD_RESOURCES', actionType: 'resource',
          description: `Tải lên ${descriptions.join(' và ')}`,
          groupId,
        });
      }

      onSuccess(); // Refresh resource list without closing dialog
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setPendingFiles([]);
    setPendingLinks([]);
    setPendingDriveFiles([]);
    setLinkName('');
    setLinkUrl('');
    setGlobalCategory('general');
    setActiveTab('file');
    onOpenChange(false);
    onClose?.();
  };

  const allDone = totalItems > 0 && totalDone === totalItems;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) resetAndClose(); }}>
      <DialogContent className="max-w-[1280px] w-[95vw] h-[720px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          {...{ webkitdirectory: '', directory: '' } as any}
          onChange={handleFolderSelected}
        />

        <div className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-primary" />
              Thêm tài nguyên
              {folderId && folderName && (
                <Badge variant="outline" className="ml-2 font-normal">vào {folderName}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Tải file, thêm link hoặc tải cả thư mục. Bạn có thể kết hợp nhiều cách trong cùng một phiên.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 shrink-0 my-3">
              <TabsTrigger value="file" className="gap-2">
                <Upload className="w-4 h-4" />
                Tải file
                {pendingFiles.filter(f => f.source === 'file').length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{pendingFiles.filter(f => f.source === 'file').length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-2">
                <LinkIcon className="w-4 h-4" />
                Thêm link
                {pendingLinks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{pendingLinks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="folder" className="gap-2">
                <FolderUp className="w-4 h-4" />
                Tải thư mục
                {pendingFiles.filter(f => f.source === 'folder').length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{pendingFiles.filter(f => f.source === 'folder').length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden flex flex-col">
              {/* === FILE TAB === */}
              <TabsContent value="file" className="flex-1 mt-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-200/50 mb-3 shrink-0">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Hướng dẫn tải file</p>
                    <p>• Nhấn <strong>"Chọn file"</strong> hoặc kéo thả file vào vùng bên dưới.</p>
                    <p>• Hỗ trợ tải <strong>nhiều file cùng lúc</strong>. Mỗi file tối đa 50MB.</p>
                    <p>• Bạn có thể <strong>đổi tên</strong> từng file trước khi xác nhận tải lên.</p>
                  </div>
                </div>

                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files);
                    const input = fileInputRef.current;
                    if (input) {
                      const dt = new DataTransfer();
                      files.forEach(f => dt.items.add(f));
                      input.files = dt.files;
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Nhấn để chọn file hoặc kéo thả vào đây</p>
                  <p className="text-xs text-muted-foreground mt-1">Hỗ trợ nhiều file, tối đa 50MB/file</p>
                </div>

                {pendingFiles.filter(f => f.source === 'file').length > 0 && (
                  <ScrollArea className="flex-1 mt-3">
                    <div className="space-y-2 pr-2">
                      {pendingFiles.filter(f => f.source === 'file').map((item) => (
                        <div key={item.id} className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border bg-card",
                          item.status === 'done' && "border-green-200 bg-green-500/5",
                          item.status === 'error' && "border-red-200 bg-red-500/5",
                        )}>
                          <div className="w-8 h-8 rounded flex items-center justify-center bg-muted shrink-0">
                            {getFileIcon(item.file.name)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              {item.status === 'pending' ? (
                                <Input
                                  value={item.customName}
                                  onChange={(e) => updateFileName(item.id, e.target.value)}
                                  className="h-7 text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-sm font-medium truncate">{item.customName}.{item.file.name.split('.').pop()}</span>
                              )}
                              <span className="text-[10px] text-muted-foreground shrink-0">.{item.file.name.split('.').pop()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(item.file.size)}</span>
                              {item.status === 'pending' && (
                                <Select value={item.category} onValueChange={(v) => updateFileCategory(item.id, v)}>
                                  <SelectTrigger className="h-5 text-[10px] w-auto px-2 py-0 border-0 bg-muted">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CATEGORIES.map(c => (
                                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {item.status === 'done' && (
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Hoàn tất</span>
                              )}
                              {item.status === 'error' && (
                                <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-3 h-3" /> {item.error}</span>
                              )}
                            </div>
                            {item.status === 'uploading' && (
                              <Progress value={item.progress} className="h-1" />
                            )}
                          </div>
                          {item.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(item.id)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* === LINK TAB === */}
              <TabsContent value="link" className="flex-1 mt-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/5 border border-green-200/50 mb-3 shrink-0">
                  <Info className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Hướng dẫn thêm link</p>
                    <p>• Nhập <strong>tên hiển thị</strong> và <strong>URL</strong> của tài nguyên, sau đó nhấn "Thêm vào danh sách".</p>
                    <p>• Hỗ trợ thêm <strong>nhiều link cùng lúc</strong> trước khi xác nhận.</p>
                    <p>• Phù hợp với link Google Drive, Notion, website tham khảo, v.v.</p>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end shrink-0">
                  <div className="space-y-1">
                    <Label className="text-xs">Tên hiển thị</Label>
                    <Input
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                      placeholder="VD: Tài liệu tham khảo..."
                      className="h-9"
                      onKeyDown={(e) => e.key === 'Enter' && addLink()}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      type="url"
                      className="h-9"
                      onKeyDown={(e) => e.key === 'Enter' && addLink()}
                    />
                  </div>
                  <Button onClick={addLink} size="sm" className="h-9 gap-1">
                    <Plus className="w-4 h-4" />
                    Thêm
                  </Button>
                </div>

                {pendingLinks.length > 0 && (
                  <ScrollArea className="flex-1 mt-3">
                    <div className="space-y-2 pr-2">
                      {pendingLinks.map((item) => (
                        <div key={item.id} className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border bg-card",
                          item.status === 'done' && "border-green-200 bg-green-500/5",
                          item.status === 'error' && "border-red-200 bg-red-500/5",
                        )}>
                          <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-500/10 shrink-0">
                            <LinkIcon className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="truncate max-w-[200px]">{item.url}</span>
                              {item.status === 'pending' && (
                                <Select value={item.category} onValueChange={(v) => updateLinkCategory(item.id, v)}>
                                  <SelectTrigger className="h-5 text-[10px] w-auto px-2 py-0 border-0 bg-muted">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CATEGORIES.map(c => (
                                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {item.status === 'done' && (
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Hoàn tất</span>
                              )}
                              {item.status === 'error' && (
                                <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-3 h-3" /> {item.error}</span>
                              )}
                            </div>
                          </div>
                          {item.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeLink(item.id)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {pendingLinks.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Chưa có link nào. Nhập thông tin ở trên và nhấn "Thêm".
                  </div>
                )}
              </TabsContent>

              {/* === FOLDER TAB === */}
              <TabsContent value="folder" className="flex-1 mt-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-200/50 mb-3 shrink-0">
                  <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Hướng dẫn tải thư mục</p>
                    <p>• Nhấn <strong>"Chọn thư mục"</strong> để chọn toàn bộ thư mục từ máy tính.</p>
                    <p>• Hệ thống sẽ tự động <strong>nhận tất cả file</strong> trong thư mục đó.</p>
                    <p>• Bạn có thể <strong>đổi tên</strong> từng file trước khi xác nhận tải lên.</p>
                    <p>• Mỗi file tối đa 50MB, file lớn hơn sẽ bị bỏ qua.</p>
                  </div>
                </div>

                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors shrink-0"
                  onClick={() => folderInputRef.current?.click()}
                >
                  <FolderUp className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Nhấn để chọn thư mục</p>
                  <p className="text-xs text-muted-foreground mt-1">Toàn bộ file trong thư mục sẽ được tải lên</p>
                </div>

                {pendingFiles.filter(f => f.source === 'folder').length > 0 && (
                  <ScrollArea className="flex-1 mt-3">
                    <div className="space-y-2 pr-2">
                      {pendingFiles.filter(f => f.source === 'folder').map((item) => (
                        <div key={item.id} className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border bg-card",
                          item.status === 'done' && "border-green-200 bg-green-500/5",
                          item.status === 'error' && "border-red-200 bg-red-500/5",
                        )}>
                          <div className="w-8 h-8 rounded flex items-center justify-center bg-muted shrink-0">
                            {getFileIcon(item.file.name)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              {item.status === 'pending' ? (
                                <Input
                                  value={item.customName}
                                  onChange={(e) => updateFileName(item.id, e.target.value)}
                                  className="h-7 text-sm"
                                />
                              ) : (
                                <span className="text-sm font-medium truncate">{item.customName}.{item.file.name.split('.').pop()}</span>
                              )}
                              <span className="text-[10px] text-muted-foreground shrink-0">.{item.file.name.split('.').pop()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(item.file.size)}</span>
                              {item.file.webkitRelativePath && (
                                <span className="truncate max-w-[200px]" title={item.file.webkitRelativePath}>
                                  📁 {item.file.webkitRelativePath}
                                </span>
                              )}
                              {item.status === 'done' && (
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Hoàn tất</span>
                              )}
                              {item.status === 'error' && (
                                <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-3 h-3" /> {item.error}</span>
                              )}
                            </div>
                            {item.status === 'uploading' && (
                              <Progress value={item.progress} className="h-1" />
                            )}
                          </div>
                          {item.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(item.id)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {pendingFiles.filter(f => f.source === 'folder').length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Chưa chọn thư mục nào.
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {totalItems > 0 ? (
              <span>
                <strong>{totalItems}</strong> tài nguyên
                {totalDone > 0 && <span className="text-green-600 ml-2">({totalDone} hoàn tất)</span>}
              </span>
            ) : (
              'Chưa có tài nguyên nào'
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={globalCategory} onValueChange={setGlobalCategory}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Phân loại mặc định" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetAndClose} disabled={isSubmitting}>
              {allDone ? 'Đóng' : 'Hủy'}
            </Button>
            <Button
              onClick={handleSubmitAll}
              disabled={isSubmitting || totalPending === 0}
              className="gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
              ) : allDone ? (
                <><CheckCircle2 className="w-4 h-4" /> Hoàn tất</>
              ) : (
                <><Upload className="w-4 h-4" /> Tải lên ({totalPending})</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
