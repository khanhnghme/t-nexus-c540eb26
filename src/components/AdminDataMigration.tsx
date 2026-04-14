import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Loader2, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import JSZip from 'jszip';

// All 42 tables in foreign-key-safe insertion order
const TABLE_ORDER = [
  'profiles',
  'user_roles',
  'system_settings',
  'system_notifications',
  'system_error_logs',
  'notification_dismissals',
  'password_reset_codes',
  'profile_achievements',
  'email_logs',
  'email_send_log',
  'email_send_state',
  'email_unsubscribe_tokens',
  'suppressed_emails',
  'groups',
  'group_members',
  'stages',
  'stage_weights',
  'pending_approvals',
  'tasks',
  'task_assignments',
  'task_scores',
  'task_notes',
  'task_note_attachments',
  'task_comments',
  'submission_history',
  'member_stage_scores',
  'member_final_scores',
  'score_appeals',
  'appeal_attachments',
  'score_adjustment_history',
  'project_messages',
  'message_mentions',
  'notifications',
  'feedbacks',
  'feedback_comments',
  'feedback_reactions',
  'meetings',
  'meeting_attendance',
  'meeting_messages',
  'project_resources',
  'resource_folders',
  'activity_logs',
];

const STORAGE_BUCKETS = [
  'avatars',
  'task-submissions',
  'project-resources',
  'group-images',
  'task-note-attachments',
  'appeal-attachments',
  'profile-achievements',
  'system-assets',
];

interface StepInfo {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

interface MigrationReport {
  status: 'success' | 'error';
  duration: number;
  recordCounts: Record<string, number>;
  fileCount: number;
  zipSize: number;
  errors: string[];
}

export default function AdminDataMigration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  const addStep = (label: string, status: StepInfo['status'] = 'running') => {
    setSteps(prev => {
      const updated = prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const } : s);
      return [...updated, { label, status }];
    });
  };

  const markStepError = (label: string) => {
    setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' as const, label } : s));
  };

  const paginatedFetch = async (table: string): Promise<any[]> => {
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await (supabase.from as any)(table).select('*').range(from, from + PAGE_SIZE - 1);
      if (error) { console.warn(`Fetch error ${table}:`, error); break; }
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const listAllFiles = async (bucket: string): Promise<string[]> => {
    const paths: string[] = [];
    const listRecursive = async (prefix: string) => {
      const { data, error } = await r2Storage.from(bucket).list(prefix, { limit: 1000 });
      if (error || !data) return;
      for (const item of data) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) {
          paths.push(fullPath);
        } else {
          await listRecursive(fullPath);
        }
      }
    };
    await listRecursive('');
    return paths;
  };

  const generateChecksum = (data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  // ═══════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════
  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setSteps([]);
    setReport(null);
    setShowDialog(true);
    cancelRef.current = false;
    const startTime = Date.now();
    const errors: string[] = [];
    const recordCounts: Record<string, number> = {};
    let fileCount = 0;

    try {
      const zip = new JSZip();
      const dataFolder = zip.folder('data')!;
      const filesFolder = zip.folder('files')!;
      const totalSteps = TABLE_ORDER.length + STORAGE_BUCKETS.length + 2;

      // Fetch all tables
      for (let i = 0; i < TABLE_ORDER.length; i++) {
        if (cancelRef.current) throw new Error('CANCELLED');
        const table = TABLE_ORDER[i];
        addStep(`Đang tải bảng ${table}...`);
        setProgress(Math.round(((i + 1) / totalSteps) * 100));
        try {
          const data = await paginatedFetch(table);
          recordCounts[table] = data.length;
          dataFolder.file(`${table}.json`, JSON.stringify(data, null, 2));
        } catch (err: any) {
          errors.push(`Lỗi tải ${table}: ${err.message}`);
          recordCounts[table] = 0;
          dataFolder.file(`${table}.json`, '[]');
        }
      }

      // Fetch all storage files
      for (let i = 0; i < STORAGE_BUCKETS.length; i++) {
        if (cancelRef.current) throw new Error('CANCELLED');
        const bucket = STORAGE_BUCKETS[i];
        addStep(`Đang tải file từ bucket ${bucket}...`);
        setProgress(Math.round(((TABLE_ORDER.length + i + 1) / totalSteps) * 100));
        try {
          const filePaths = await listAllFiles(bucket);
          const bucketFolder = filesFolder.folder(bucket)!;
          for (const filePath of filePaths) {
            if (cancelRef.current) throw new Error('CANCELLED');
            try {
              const { data: blob } = await r2Storage.from(bucket).download(filePath);
              if (blob) {
                bucketFolder.file(filePath, blob);
                fileCount++;
              }
            } catch {
              errors.push(`Lỗi tải file ${bucket}/${filePath}`);
            }
          }
        } catch (err: any) {
          errors.push(`Lỗi liệt kê bucket ${bucket}: ${err.message}`);
        }
      }

      // Create manifest
      addStep('Đang tạo manifest...');
      const manifest = {
        version: '2.0-migration',
        type: 'full_system_migration',
        exported_at: new Date().toISOString(),
        exported_by: user?.id,
        supabase_url: import.meta.env.VITE_SUPABASE_URL,
        record_counts: recordCounts,
        file_count: fileCount,
        tables: TABLE_ORDER,
        buckets: STORAGE_BUCKETS,
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      // Generate ZIP
      addStep('Đang nén file ZIP...');
      setProgress(95);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `migration-full-system-${timestamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      addStep('Hoàn tất xuất dữ liệu!');
      setReport({
        status: errors.length > 0 ? 'error' : 'success',
        duration: Date.now() - startTime,
        recordCounts,
        fileCount,
        zipSize: blob.size,
        errors,
      });
      toast({ title: 'Xuất thành công', description: `Đã xuất ${Object.values(recordCounts).reduce((a, b) => a + b, 0)} bản ghi + ${fileCount} file` });
    } catch (err: any) {
      if (err.message === 'CANCELLED') {
        addStep('Đã hủy!');
        toast({ title: 'Đã hủy xuất dữ liệu' });
      } else {
        markStepError(`Lỗi: ${err.message}`);
        toast({ title: 'Lỗi xuất', description: err.message, variant: 'destructive' });
      }
    } finally {
      setIsExporting(false);
    }
  };

  // ═══════════════════════════════════════
  // IMPORT
  // ═══════════════════════════════════════
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowConfirmImport(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!pendingFile) return;
    setShowConfirmImport(false);
    setIsImporting(true);
    setProgress(0);
    setSteps([]);
    setReport(null);
    setShowDialog(true);
    cancelRef.current = false;
    const startTime = Date.now();
    const errors: string[] = [];
    const recordCounts: Record<string, number> = {};
    let fileCount = 0;

    try {
      addStep('Đang đọc file ZIP...');
      const zip = await JSZip.loadAsync(pendingFile);

      // Validate manifest
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) throw new Error('Không tìm thấy manifest.json - file không hợp lệ');
      const manifest = JSON.parse(await manifestFile.async('text'));
      if (manifest.type !== 'full_system_migration') {
        throw new Error('File này không phải bản di dời toàn hệ thống. Vui lòng sử dụng chức năng Sao lưu & Khôi phục cho bản sao lưu project.');
      }

      const sourceUrl = manifest.supabase_url || '';
      const currentUrl = import.meta.env.VITE_SUPABASE_URL;
      const totalSteps = TABLE_ORDER.length * 2 + STORAGE_BUCKETS.length + 2;
      let stepIdx = 0;

      // Delete existing data in reverse order
      const reverseOrder = [...TABLE_ORDER].reverse();
      for (const table of reverseOrder) {
        if (cancelRef.current) throw new Error('CANCELLED');
        stepIdx++;
        addStep(`Đang xóa dữ liệu cũ: ${table}...`);
        setProgress(Math.round((stepIdx / totalSteps) * 100));
        try {
          // Delete all rows - use a filter that matches everything
          await (supabase.from as any)(table).delete().gte('created_at', '1970-01-01');
        } catch (err: any) {
          // Some tables may not have created_at, try alternative
          try {
            await (supabase.from as any)(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          } catch (err2: any) {
            errors.push(`Không thể xóa ${table}: ${err2.message}`);
          }
        }
      }

      // Insert data in correct order
      for (const table of TABLE_ORDER) {
        if (cancelRef.current) throw new Error('CANCELLED');
        stepIdx++;
        addStep(`Đang nhập dữ liệu: ${table}...`);
        setProgress(Math.round((stepIdx / totalSteps) * 100));
        const dataFile = zip.file(`data/${table}.json`);
        if (!dataFile) {
          recordCounts[table] = 0;
          continue;
        }
        try {
          let rows = JSON.parse(await dataFile.async('text'));
          if (!Array.isArray(rows) || rows.length === 0) {
            recordCounts[table] = 0;
            continue;
          }

          // Remap ALL Supabase storage URLs (any instance) to current instance
          const remapValue = (val: any): any => {
            if (typeof val === 'string') {
              // Match any Supabase storage URL from any instance
              return val.replace(
                /https?:\/\/[^/\s"']+\/storage\/v1\/object\/public\/([^/\s"']+)\/([^\s"']+)/g,
                (_match: string, bucket: string, path: string) => {
                  if (STORAGE_BUCKETS.includes(bucket)) {
                    const { data } = r2Storage.from(bucket).getPublicUrl(path);
                    return data.publicUrl;
                  }
                  return _match; // Not our bucket, keep as-is
                }
              );
            }
            if (Array.isArray(val)) return val.map(remapValue);
            if (val && typeof val === 'object') {
              const out: any = {};
              for (const k of Object.keys(val)) out[k] = remapValue(val[k]);
              return out;
            }
            return val;
          };

          rows = rows.map((row: any) => {
            const remapped: any = {};
            for (const key of Object.keys(row)) {
              remapped[key] = remapValue(row[key]);
            }
            return remapped;
          });

          // Insert in batches of 500
          const BATCH_SIZE = 500;
          let inserted = 0;
          for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            if (cancelRef.current) throw new Error('CANCELLED');
            const batch = rows.slice(i, i + BATCH_SIZE);
            const { error } = await (supabase.from as any)(table).upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
            if (error) {
              errors.push(`Lỗi nhập ${table} (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`);
            } else {
              inserted += batch.length;
            }
          }
          recordCounts[table] = inserted;
        } catch (err: any) {
          errors.push(`Lỗi xử lý ${table}: ${err.message}`);
          recordCounts[table] = 0;
        }
      }

      // Upload storage files
      for (let i = 0; i < STORAGE_BUCKETS.length; i++) {
        if (cancelRef.current) throw new Error('CANCELLED');
        const bucket = STORAGE_BUCKETS[i];
        stepIdx++;
        addStep(`Đang tải file lên bucket ${bucket}...`);
        setProgress(Math.round((stepIdx / totalSteps) * 100));

        const bucketPrefix = `files/${bucket}/`;
        const bucketFiles = Object.keys(zip.files).filter(f => f.startsWith(bucketPrefix) && !zip.files[f].dir);

        for (const zipPath of bucketFiles) {
          if (cancelRef.current) throw new Error('CANCELLED');
          const storagePath = zipPath.replace(bucketPrefix, '');
          try {
            const blob = await zip.files[zipPath].async('blob');
            const { error } = await r2Storage.from(bucket).upload(storagePath, blob, { upsert: true });
            if (error) {
              errors.push(`Lỗi upload ${bucket}/${storagePath}: ${error.message}`);
            } else {
              fileCount++;
            }
          } catch (err: any) {
            errors.push(`Lỗi upload ${bucket}/${storagePath}: ${err.message}`);
          }
        }
      }

      setProgress(100);
      addStep('Hoàn tất nhập dữ liệu!');
      const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);
      setReport({
        status: errors.length > 0 ? 'error' : 'success',
        duration: Date.now() - startTime,
        recordCounts,
        fileCount,
        zipSize: pendingFile.size,
        errors,
      });
      toast({
        title: errors.length > 0 ? 'Nhập hoàn tất (có lỗi)' : 'Nhập thành công',
        description: `Đã nhập ${totalRecords} bản ghi + ${fileCount} file` + (errors.length > 0 ? ` (${errors.length} lỗi)` : ''),
        variant: errors.length > 0 ? 'destructive' : 'default',
      });
    } catch (err: any) {
      if (err.message === 'CANCELLED') {
        addStep('Đã hủy!');
        toast({ title: 'Đã hủy nhập dữ liệu' });
      } else {
        markStepError(`Lỗi: ${err.message}`);
        toast({ title: 'Lỗi nhập', description: err.message, variant: 'destructive' });
      }
    } finally {
      setIsImporting(false);
      setPendingFile(null);
    }
  };

  const isProcessing = isExporting || isImporting;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleExport}
          disabled={isProcessing}
          className="flex-1"
          variant="outline"
        >
          {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Xuất toàn bộ hệ thống
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex-1"
          variant="outline"
        >
          {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Nhập từ file ZIP
        </Button>
        <input ref={fileInputRef} type="file" accept=".zip" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Xuất: {TABLE_ORDER.length} bảng dữ liệu + {STORAGE_BUCKETS.length} bucket storage</p>
        <p>• Nhập: Ghi đè toàn bộ dữ liệu hiện tại, khôi phục giống 100%</p>
        <p>• Tự động ánh xạ URL storage khi chuyển instance</p>
      </div>

      {/* Progress Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!isProcessing) setShowDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {isExporting ? 'Đang xuất dữ liệu...' : isImporting ? 'Đang nhập dữ liệu...' : 'Kết quả'}
            </DialogTitle>
            <DialogDescription>
              {isProcessing ? 'Vui lòng không đóng trang này' : report ? `Hoàn tất trong ${formatDuration(report.duration)}` : ''}
            </DialogDescription>
          </DialogHeader>

          {isProcessing && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{progress}%</p>
            </div>
          )}

          <ScrollArea className="max-h-60">
            <div className="space-y-1">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {step.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  {step.status === 'done' && <CheckCircle className="w-3 h-3 text-primary" />}
                  {step.status === 'error' && <XCircle className="w-3 h-3 text-destructive" />}
                  {step.status === 'pending' && <div className="w-3 h-3 rounded-full border" />}
                  <span className={step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}>{step.label}</span>
                </div>
              ))}
            </div>
          </ScrollArea>

          {report && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {report.status === 'success'
                  ? <><CheckCircle className="w-4 h-4 text-primary" /> Thành công</>
                  : <><AlertTriangle className="w-4 h-4 text-warning" /> Hoàn tất có lỗi ({report.errors.length})</>
                }
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Tổng bản ghi: {Object.values(report.recordCounts).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                <span>Tổng file: {report.fileCount}</span>
                <span>Kích thước ZIP: {formatFileSize(report.zipSize)}</span>
                <span>Thời gian: {formatDuration(report.duration)}</span>
              </div>
              {report.errors.length > 0 && (
                <ScrollArea className="max-h-32 border rounded p-2 mt-2">
                  {report.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err}</p>
                  ))}
                </ScrollArea>
              )}
            </div>
          )}

          {isProcessing && (
            <Button variant="destructive" size="sm" onClick={() => { cancelRef.current = true; }}>
              Hủy
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Import */}
      <AlertDialog open={showConfirmImport} onOpenChange={setShowConfirmImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Xác nhận nhập dữ liệu
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">⚠️ CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ dữ liệu hiện tại và thay thế bằng dữ liệu từ file ZIP.</p>
              <p>Bao gồm: tất cả thành viên, quyền, project, task, điểm, file, tin nhắn, và mọi dữ liệu khác.</p>
              <p>Hành động này <span className="font-bold">KHÔNG THỂ HOÀN TÁC</span>.</p>
              {pendingFile && <p className="text-xs">File: {pendingFile.name} ({formatFileSize(pendingFile.size)})</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button onClick={handleImport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa tất cả & Nhập dữ liệu
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
