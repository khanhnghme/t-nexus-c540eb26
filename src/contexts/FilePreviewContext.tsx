import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { 
  Download, FileText, X, ChevronLeft, ChevronRight, 
  File, FileSpreadsheet, Presentation, Image as ImageIcon, 
  FolderDown, Loader2, ExternalLink, Music
} from 'lucide-react';
import { r2Storage, ensureR2Initialized } from '@/lib/r2Storage';
import JSZip from 'jszip';
import ettLogo from '@/assets/t-nexus-text-white.png';

interface PreviewFile {
  file_path: string;
  file_name: string;
  file_size: number;
  storage_name?: string;
}

interface FilePreviewOptions {
  siblingFiles?: PreviewFile[];
  activeIndex?: number;
  projectSlug?: string;
  taskSlug?: string;
  taskId?: string;
}

interface FilePreviewContextType {
  openFilePreview: (url: string, fileName?: string, options?: FilePreviewOptions) => void;
  closeFilePreview: () => void;
}

const FilePreviewContext = createContext<FilePreviewContextType | null>(null);

export function useFilePreview() {
  const ctx = useContext(FilePreviewContext);
  if (!ctx) throw new Error('useFilePreview must be used within FilePreviewProvider');
  return ctx;
}

// ── Helpers ──

const getFileIcon = (fileName: string, size: 'sm' | 'lg' = 'lg') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconClass = size === 'lg' ? 'w-16 h-16' : 'w-4 h-4';
  switch (ext) {
    case 'pdf': return <FileText className={`${iconClass} text-red-500`} />;
    case 'doc': case 'docx': return <FileText className={`${iconClass} text-blue-500`} />;
    case 'xls': case 'xlsx': case 'csv': return <FileSpreadsheet className={`${iconClass} text-green-500`} />;
    case 'ppt': case 'pptx': return <Presentation className={`${iconClass} text-orange-500`} />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return <ImageIcon className={`${iconClass} text-purple-500`} />;
    default: return <File className={`${iconClass} text-muted-foreground`} />;
  }
};

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const isPreviewableImage = (fn: string) => ['jpg','jpeg','png','gif','webp','bmp','svg','ico'].includes(fn.split('.').pop()?.toLowerCase() || '');
const isPDF = (fn: string) => fn.toLowerCase().endsWith('.pdf');
const isOfficeDoc = (fn: string) => ['doc','docx','xls','xlsx','ppt','pptx'].includes(fn.split('.').pop()?.toLowerCase() || '');
const isTextFile = (fn: string) => ['txt','md','json','xml','html','css','js','ts','jsx','tsx','py','java','c','cpp','h','cs','php','rb','go','rs','sql','sh','bat','yaml','yml','toml','ini','cfg','log','csv'].includes(fn.split('.').pop()?.toLowerCase() || '');
const isVideoFile = (fn: string) => ['mp4','webm','ogg','mov','avi','mkv'].includes(fn.split('.').pop()?.toLowerCase() || '');
const isAudioFile = (fn: string) => ['mp3','wav','ogg','flac','aac','m4a','wma'].includes(fn.split('.').pop()?.toLowerCase() || '');

// ── PDF Viewer with Google fallback ──

function PdfViewer({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setUseGoogleViewer(false);
    timerRef.current = setTimeout(() => setUseGoogleViewer(true), 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fileUrl]);

  const src = useGoogleViewer
    ? `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : `${fileUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;

  return (
    <div className="w-full h-full flex-1 min-h-0" style={{ minHeight: '400px' }}>
      <iframe
        ref={iframeRef}
        key={useGoogleViewer ? 'google' : 'direct'}
        src={src}
        className="w-full h-full border-0"
        title={fileName}
        allow="fullscreen"
        onLoad={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
      />
    </div>
  );
}

// ── Text File Viewer ──

function TextFileViewer({ url, fileName }: { url: string; fileName: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(r => r.text())
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => { setContent(null); setLoading(false); });
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <FileText className="w-12 h-12" />
        <p className="text-sm">Không thể đọc nội dung file</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full flex-1">
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words bg-muted/30">
        {content}
      </pre>
    </ScrollArea>
  );
}

// ── Provider ──

export function FilePreviewProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [siblingFiles, setSiblingFiles] = useState<PreviewFile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const hasGallery = siblingFiles.length > 1;
  const currentFile = siblingFiles[activeIndex] || null;
  const fileName = currentFile?.file_name || previewFileName || 'file';
  const fileSize = currentFile?.file_size || 0;

  const canPreview = fileName ? (isPreviewableImage(fileName) || isPDF(fileName) || isOfficeDoc(fileName) || isTextFile(fileName) || isVideoFile(fileName) || isAudioFile(fileName)) : false;

  const openFilePreview = useCallback((url: string, fName?: string, options?: FilePreviewOptions) => {
    setPreviewUrl(url);
    setPreviewFileName(fName || '');
    setSiblingFiles(options?.siblingFiles || []);
    setActiveIndex(options?.activeIndex ?? 0);
    setIsOpen(true);
  }, []);

  const closeFilePreview = useCallback(() => {
    setIsOpen(false);
    setPreviewUrl('');
    setPreviewFileName('');
    setSiblingFiles([]);
    setActiveIndex(0);
  }, []);

  const navigateToFile = useCallback(async (index: number) => {
    if (index < 0 || index >= siblingFiles.length) return;
    const file = siblingFiles[index];
    const bucket = file.storage_name || 'task-submissions';
    const { data } = await r2Storage.from(bucket).getPublicUrlAsync(file.file_path);
    setPreviewUrl(data.publicUrl);
    setPreviewFileName(file.file_name);
    setActiveIndex(index);
  }, [siblingFiles]);

  const handleDownload = useCallback(async () => {
    if (!previewUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [previewUrl, fileName]);

  const handleDownloadAll = useCallback(async () => {
    if (siblingFiles.length === 0) return;
    setIsDownloadingAll(true);
    try {
      await ensureR2Initialized();
      const zip = new JSZip();
      for (const file of siblingFiles) {
        const bucket = file.storage_name || 'task-submissions';
        const { data } = r2Storage.from(bucket).getPublicUrl(file.file_path);
        const response = await fetch(data.publicUrl);
        const blob = await response.blob();
        zip.file(file.file_name, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download all error:', err);
    } finally {
      setIsDownloadingAll(false);
    }
  }, [siblingFiles]);

  const getOfficeViewerUrl = (url: string) => {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !hasGallery) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigateToFile(activeIndex - 1);
      if (e.key === 'ArrowRight') navigateToFile(activeIndex + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, hasGallery, activeIndex, navigateToFile]);

  return (
    <FilePreviewContext.Provider value={{ openFilePreview, closeFilePreview }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeFilePreview(); }}>
        <DialogContent
          className="max-w-[92vw] w-[92vw] p-0 gap-0 overflow-hidden rounded-xl border shadow-2xl [&>button:last-child]:hidden flex flex-col bg-background"
          style={{ height: '88vh', maxHeight: '88vh' }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <VisuallyHidden><DialogTitle>Xem trước file</DialogTitle></VisuallyHidden>
          <VisuallyHidden><DialogDescription>Xem trước nội dung file</DialogDescription></VisuallyHidden>

          {/* ── Header — matches old full-page style ── */}
          <header className="bg-primary text-primary-foreground shadow-md shrink-0">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                                      <img src={ettLogo} alt="ETT Logo" className="h-8 w-auto drop-shadow-md" loading="lazy" />
                  <div className="hidden sm:block">
                    <span className="font-semibold">Xem trước file</span>
                    {fileName && (
                      <span className="text-primary-foreground/70 text-sm ml-2">• {fileName}</span>
                    )}
                  </div>
                  <div className="sm:hidden">
                    <h1 className="font-semibold text-sm truncate max-w-[200px]">
                      {fileName || 'Xem trước file'}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {siblingFiles.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownloadAll}
                      disabled={isDownloadingAll}
                      className="gap-2"
                    >
                      {isDownloadingAll ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FolderDown className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Tải toàn bộ file</span>
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Mở tab mới</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeFilePreview}
                    className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* ── File Navigation Bar ── */}
          {hasGallery && (
            <div className="bg-muted/50 border-b shrink-0">
              <div className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateToFile(activeIndex - 1)}
                    disabled={activeIndex <= 0}
                    className="shrink-0 h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <ScrollArea className="flex-1">
                    <div className="flex gap-1.5 py-1">
                      {siblingFiles.map((file, index) => (
                        <button
                          key={file.file_path + index}
                          onClick={() => navigateToFile(index)}
                          title={`${file.file_name} (${formatFileSize(file.file_size)})`}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors shrink-0 ${
                            index === activeIndex
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-background hover:bg-muted border border-border/60'
                          }`}
                        >
                          {getFileIcon(file.file_name, 'sm')}
                          <span className="max-w-[100px] truncate">{file.file_name}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateToFile(activeIndex + 1)}
                    disabled={activeIndex >= siblingFiles.length - 1}
                    className="shrink-0 h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  <Badge variant="secondary" className="text-xs shrink-0 px-2">
                    {activeIndex + 1}/{siblingFiles.length}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* ── Main Content ── */}
          <main className="flex-1 flex flex-col px-4 py-3 overflow-auto min-h-0">
            <div className="flex flex-col flex-1 gap-3 min-h-0 w-full">
              {/* File Info Card */}
              <Card className="p-4 shrink-0">
                <div className="flex items-center gap-4">
                  {getFileIcon(fileName, 'sm')}
                  <div className="flex-1 min-w-0">
                    <h1 className="font-semibold truncate">{fileName}</h1>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(fileSize)}
                    </p>
                  </div>
                  <Button onClick={handleDownload} disabled={isDownloading} className="gap-2 shrink-0">
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Tải xuống
                  </Button>
                </div>
              </Card>

              {/* Preview Area */}
              <Card className="overflow-hidden flex-1 flex flex-col min-h-0">
                {canPreview ? (
                  <div className="bg-muted/30 flex-1 flex flex-col min-h-0">
                    {isPreviewableImage(fileName) ? (
                      <div className="flex items-center justify-center p-2 sm:p-4 flex-1 min-h-[200px]">
                        <img
                          src={previewUrl}
                          alt={fileName}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                      </div>
                    ) : isPDF(fileName) ? (
                      <PdfViewer fileUrl={previewUrl} fileName={fileName} />
                    ) : isOfficeDoc(fileName) ? (
                      <div className="w-full flex-1 min-h-0" style={{ minHeight: '400px' }}>
                        <iframe
                          src={getOfficeViewerUrl(previewUrl)}
                          className="w-full h-full border-0"
                          title={fileName}
                          style={{ WebkitOverflowScrolling: 'touch', overflow: 'auto' } as any}
                          allow="fullscreen"
                        />
                      </div>
                    ) : isVideoFile(fileName) ? (
                      <div className="flex items-center justify-center p-4 flex-1 min-h-[200px]">
                        <video src={previewUrl} controls className="max-w-full max-h-full rounded-lg shadow-lg">
                          Trình duyệt không hỗ trợ phát video.
                        </video>
                      </div>
                    ) : isAudioFile(fileName) ? (
                      <div className="flex flex-col items-center justify-center p-8 flex-1 min-h-[200px]">
                        {getFileIcon(fileName)}
                        <h3 className="text-lg font-medium mt-4 mb-6">{fileName}</h3>
                        <audio src={previewUrl} controls className="w-full max-w-md">
                          Trình duyệt không hỗ trợ phát audio.
                        </audio>
                      </div>
                    ) : isTextFile(fileName) ? (
                      <div className="w-full flex-1 flex flex-col min-h-0" style={{ minHeight: '300px' }}>
                        <TextFileViewer url={previewUrl} fileName={fileName} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 min-h-[40vh] text-center">
                    {getFileIcon(fileName)}
                    <h2 className="text-xl font-semibold mt-6 mb-2">
                      Không thể xem trước file này
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      Định dạng file này không hỗ trợ xem trước trực tiếp. 
                      Vui lòng tải file về để xem nội dung.
                    </p>
                    <Button onClick={handleDownload} className="gap-2">
                      <Download className="w-4 h-4" />
                      Tải xuống
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </main>
        </DialogContent>
      </Dialog>
    </FilePreviewContext.Provider>
  );
}
