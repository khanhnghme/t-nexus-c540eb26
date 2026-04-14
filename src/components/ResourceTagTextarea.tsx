import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  File,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  FolderOpen,
  Hash,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  FolderInput,
  FileDown,
  ClipboardList,
  User,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ResourceItem {
  id: string;
  name: string;
  file_path: string;
  category: string | null;
  folder_name?: string;
  folder_id?: string;
  resource_type?: string;
  link_url?: string;
}

interface FolderGroup {
  id: string;
  name: string;
  files: ResourceItem[];
}

// A single file/link inside a submission
interface SubFileItem {
  file_name: string;
  file_path: string;
  storage_name?: string;
  type: 'file' | 'link';
  url?: string;
}

// One submission attempt (one row in submission_history)
interface SubmissionRecord {
  id: string;
  submitted_at: string;
  user_id: string;
  user_name: string;
  files: SubFileItem[];
}

// Task grouped with its submission attempts
interface TaskWithSubmissions {
  id: string;
  title: string;
  records: SubmissionRecord[];
  totalFiles: number;
}

interface ResourceTagTextareaProps {
  value: string;
  onChange: (value: string) => void;
  groupId: string;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  fillHeight?: boolean;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconClass = 'w-4 h-4';

  switch (ext) {
    case 'pdf':
      return <FileText className={cn(iconClass, 'text-red-500')} />;
    case 'doc':
    case 'docx':
      return <FileText className={cn(iconClass, 'text-blue-500')} />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className={cn(iconClass, 'text-green-500')} />;
    case 'ppt':
    case 'pptx':
      return <Presentation className={cn(iconClass, 'text-orange-500')} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <ImageIcon className={cn(iconClass, 'text-purple-500')} />;
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
      return <Video className={cn(iconClass, 'text-pink-500')} />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <Music className={cn(iconClass, 'text-cyan-500')} />;
    case 'zip':
    case 'rar':
    case '7z':
      return <Archive className={cn(iconClass, 'text-amber-500')} />;
    default:
      return <File className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

export default function ResourceTagTextarea({
  value,
  onChange,
  groupId,
  placeholder = 'Nhập mô tả... (gõ # để tham chiếu tài nguyên)',
  className,
  minHeight = '80px',
  disabled = false,
  fillHeight = false,
}: ResourceTagTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [triggerStart, setTriggerStart] = useState(-1);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('resources');

  // Submissions state - 3 level navigation: tasks → submissions → files
  const [tasksWithSubs, setTasksWithSubs] = useState<TaskWithSubmissions[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [openSubId, setOpenSubId] = useState<string | null>(null);

  // Fetch resources on mount
  useEffect(() => {
    if (!groupId) return;

    const fetchResources = async () => {
      setIsLoading(true);
      try {
        const { data: resourcesData } = await supabase
          .from('project_resources')
          .select('id, name, file_path, category, folder_id, resource_type, link_url')
          .eq('group_id', groupId)
          .order('name', { ascending: true });

        const { data: foldersData } = await (supabase
          .from('resource_folders' as any)
          .select('id, name')
          .eq('group_id', groupId) as any);

        const foldersMap = new Map<string, string>((foldersData || []).map((f: any) => [f.id, f.name]));

        const items: ResourceItem[] = (resourcesData || []).map(r => ({
          id: r.id,
          name: r.name,
          file_path: r.file_path,
          category: r.category,
          folder_id: (r as any).folder_id || undefined,
          folder_name: (r as any).folder_id ? (foldersMap.get((r as any).folder_id) || undefined) : undefined,
          resource_type: (r as any).resource_type || 'file',
          link_url: (r as any).link_url || undefined
        }));

        setResources(items);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [groupId]);

  // Fetch submissions when tab switches
  useEffect(() => {
    if (activeTab !== 'submissions' || !groupId || tasksWithSubs.length > 0) return;

    const fetchSubmissions = async () => {
      setIsLoadingSubs(true);
      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false });

        if (!tasks || tasks.length === 0) {
          setTasksWithSubs([]);
          setIsLoadingSubs(false);
          return;
        }

        const taskIds = tasks.map(t => t.id);

        const { data: subs } = await supabase
          .from('submission_history')
          .select('id, submission_link, submitted_at, user_id, task_id')
          .in('task_id', taskIds)
          .order('submitted_at', { ascending: false });

        // Get unique user ids for names
        const userIds = [...new Set((subs || []).map(s => s.user_id))];
        let profilesMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          profilesMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
        }

        // Build 3-level structure: task → submission records → files
        const result: TaskWithSubmissions[] = tasks
          .map(t => {
            const taskSubs = (subs || []).filter(s => s.task_id === t.id);
            const records: SubmissionRecord[] = [];

            for (const s of taskSubs) {
              try {
                const items = typeof s.submission_link === 'string'
                  ? JSON.parse(s.submission_link)
                  : s.submission_link;
                if (!Array.isArray(items) || items.length === 0) continue;

                const files: SubFileItem[] = items
                  .filter((item: any) => item.file_name || item.url)
                  .map((item: any) => ({
                    file_name: item.file_name || item.title || 'file',
                    file_path: item.file_path || '',
                    storage_name: item.storage_name,
                    type: item.type === 'link' ? 'link' as const : 'file' as const,
                    url: item.url
                  }));

                if (files.length > 0) {
                  records.push({
                    id: s.id,
                    submitted_at: s.submitted_at,
                    user_id: s.user_id,
                    user_name: profilesMap.get(s.user_id) || 'Unknown',
                    files
                  });
                }
              } catch {
                // skip unparseable
              }
            }

            return {
              id: t.id,
              title: t.title,
              records,
              totalFiles: records.reduce((sum, r) => sum + r.files.length, 0)
            };
          })
          .filter(t => t.records.length > 0);

        setTasksWithSubs(result);
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setIsLoadingSubs(false);
      }
    };

    fetchSubmissions();
  }, [activeTab, groupId, tasksWithSubs.length]);

  // Build folder groups and loose files
  const { folders, looseFiles } = useMemo(() => {
    const folderMap = new Map<string, FolderGroup>();
    const loose: ResourceItem[] = [];

    for (const r of resources) {
      if (r.folder_id && r.folder_name) {
        if (!folderMap.has(r.folder_id)) {
          folderMap.set(r.folder_id, { id: r.folder_id, name: r.folder_name, files: [] });
        }
        folderMap.get(r.folder_id)!.files.push(r);
      } else {
        loose.push(r);
      }
    }

    return { folders: Array.from(folderMap.values()), looseFiles: loose };
  }, [resources]);

  // Filtered results based on search
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    if (!q) return { folders, looseFiles };

    const matchedFolders = folders.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.files.some(file => file.name.toLowerCase().includes(q))
    );
    const matchedFiles = looseFiles.filter(f => f.name.toLowerCase().includes(q));

    return { folders: matchedFolders, looseFiles: matchedFiles };
  }, [folders, looseFiles, searchText]);

  // Filtered tasks (submissions tab level 1)
  const filteredTasks = useMemo(() => {
    const q = searchText.toLowerCase();
    if (!q) return tasksWithSubs;
    return tasksWithSubs.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.records.some(r => r.user_name.toLowerCase().includes(q) ||
        r.files.some(f => f.file_name.toLowerCase().includes(q)))
    );
  }, [tasksWithSubs, searchText]);

  // Currently open task (submissions tab level 2)
  const openTask = useMemo(() => {
    if (!openTaskId) return null;
    return tasksWithSubs.find(t => t.id === openTaskId) || null;
  }, [openTaskId, tasksWithSubs]);

  // Currently open submission record (submissions tab level 3)
  const openSub = useMemo(() => {
    if (!openSubId || !openTask) return null;
    return openTask.records.find(r => r.id === openSubId) || null;
  }, [openSubId, openTask]);

  // Currently open folder's files (filtered)
  const openFolder = useMemo(() => {
    if (!openFolderId) return null;
    const folder = folders.find(f => f.id === openFolderId);
    if (!folder) return null;
    const q = searchText.toLowerCase();
    if (!q) return folder;
    return {
      ...folder,
      files: folder.files.filter(f => f.name.toLowerCase().includes(q))
    };
  }, [openFolderId, folders, searchText]);

  // Detect # trigger to open picker
  useEffect(() => {
    if (!textareaRef.current || pickerOpen) return;

    const cursorPos = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');

    if (lastHashIndex === -1) return;

    const charBefore = lastHashIndex > 0 ? textBeforeCursor[lastHashIndex - 1] : ' ';
    if (charBefore !== ' ' && charBefore !== '\n') return;

    const afterHash = textBeforeCursor.substring(lastHashIndex + 1);
    if (afterHash.includes('\n') || afterHash.includes(' ')) return;

    if (afterHash.length === 0) {
      setTriggerStart(lastHashIndex);
      setPickerOpen(true);
      setSearchText('');
      setOpenFolderId(null);
      setOpenTaskId(null);
      setOpenSubId(null);
      setActiveTab('resources');
    }
  }, [value, pickerOpen]);

  const openPickerManually = () => {
    setTriggerStart(textareaRef.current?.selectionStart ?? value.length);
    setPickerOpen(true);
    setSearchText('');
    setOpenFolderId(null);
    setOpenTaskId(null);
    setOpenSubId(null);
    setActiveTab('resources');
  };

  const insertAtCursor = useCallback((insertText: string) => {
    const start = triggerStart >= 0 ? triggerStart : (textareaRef.current?.selectionStart ?? value.length);
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;

    const beforeTrigger = value.substring(0, start);
    const afterCursor = value.substring(cursorPos);

    const newValue = beforeTrigger + insertText + afterCursor;
    onChange(newValue);
    setPickerOpen(false);
    setTriggerStart(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = beforeTrigger.length + insertText.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [triggerStart, value, onChange]);

  const handleSelectFile = (resource: ResourceItem) => {
    if (resource.resource_type === 'link' && resource.link_url) {
      insertAtCursor(`[#${resource.name}](${resource.link_url}) `);
    } else {
      insertAtCursor(`[#${resource.name}](res:${resource.id}) `);
    }
  };

  const handleSelectFolder = (folder: FolderGroup) => {
    const links = folder.files.map(f => {
      if (f.resource_type === 'link' && f.link_url) {
        return `[#${f.name}](${f.link_url})`;
      }
      return `[#${f.name}](res:${f.id})`;
    }).join(' ');
    insertAtCursor(links + ' ');
  };

  const handleSelectSubFile = (subId: string, file: SubFileItem) => {
    if (file.type === 'link' && file.url) {
      insertAtCursor(`[#${file.file_name}](${file.url}) `);
    } else {
      insertAtCursor(`[#${file.file_name}](sub:${subId}) `);
    }
  };

  const handleSelectAllSubFiles = (sub: SubmissionRecord) => {
    const links = sub.files.map(f => {
      if (f.type === 'link' && f.url) {
        return `[#${f.file_name}](${f.url})`;
      }
      return `[#${f.file_name}](sub:${sub.id})`;
    }).join(' ');
    insertAtCursor(links + ' ');
  };

  const handleClosePicker = () => {
    if (triggerStart >= 0 && value[triggerStart] === '#') {
      const before = value.substring(0, triggerStart);
      const after = value.substring(triggerStart + 1);
      onChange(before + after);
    }
    setPickerOpen(false);
    setOpenFolderId(null);
    setOpenTaskId(null);
    setOpenSubId(null);
    setSearchText('');
    setTriggerStart(-1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleBack = () => {
    if (openSubId) {
      setOpenSubId(null);
      setSearchText('');
    } else if (openFolderId) {
      setOpenFolderId(null);
      setSearchText('');
    } else if (openTaskId) {
      setOpenTaskId(null);
      setSearchText('');
    }
  };

  const isInSubView = !!openFolderId || !!openTaskId || !!openSubId;

  // Title for dialog header
  const dialogTitle = useMemo(() => {
    if (openSubId && openSub) {
      return `${openSub.user_name} — ${format(new Date(openSub.submitted_at), 'dd/MM/yyyy HH:mm', { locale: vi })}`;
    }
    if (openTaskId && openTask) return openTask.title;
    if (openFolderId && openFolder) return openFolder.name;
    return 'Chèn tham chiếu';
  }, [openSubId, openSub, openTaskId, openTask, openFolderId, openFolder]);

  return (
    <div className={cn("relative", fillHeight && "flex-1 flex flex-col min-h-0")}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('resize-none text-sm', fillHeight && 'flex-1', className)}
        style={{ minHeight: fillHeight ? undefined : minHeight }}
        disabled={disabled}
      />

      <div className="mt-1 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
          onClick={openPickerManually}
          disabled={disabled}
        >
          <Hash className="w-3 h-3" />
          Chèn tài nguyên
        </Button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={(open) => { if (!open) handleClosePicker(); }} modal={false}>
        <DialogContent
          className="sm:max-w-2xl w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
          style={{ height: 'min(85vh, 520px)' }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
            <DialogTitle className="text-base flex items-center gap-2.5 min-w-0">
              {isInSubView ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 mr-1 shrink-0"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Quay lại
                </Button>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0">
                  <Hash className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </div>
              )}
              <span className="truncate">{dialogTitle}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Tabs - only show at root level */}
          {!isInSubView && (
            <div className="px-5 shrink-0">
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchText(''); }}>
                <TabsList className="w-full h-9">
                  <TabsTrigger value="resources" className="flex-1 text-xs gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Tài nguyên
                  </TabsTrigger>
                  <TabsTrigger value="submissions" className="flex-1 text-xs gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Bài đã nộp
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Search */}
          <div className="px-5 py-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'resources' ? 'Tìm theo tên folder hoặc tệp...' : 'Tìm theo tên task hoặc tệp...'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-9 pl-9 text-sm"
                autoFocus
              />
            </div>
          </div>

          <Separator className="shrink-0" />

          {/* Content */}
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="p-3 space-y-1">
              {activeTab === 'resources' ? (
                /* === RESOURCES TAB === */
                isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : openFolderId && openFolder ? (
                  /* Folder detail */
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors border border-sky-200 dark:border-sky-800"
                      onClick={() => handleSelectFolder(openFolder)}
                    >
                      <FolderInput className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="font-medium text-sm text-sky-700 dark:text-sky-300">Chèn cả folder ({openFolder.files.length} tệp)</span>
                    </button>

                    <div className="pt-1">
                      <p className="text-xs text-muted-foreground px-2 mb-2 font-medium">Hoặc chọn 1 tệp:</p>
                      {openFolder.files.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Không tìm thấy</p>
                      ) : (
                        <div className="space-y-0.5">
                          {openFolder.files.map(file => (
                            <button
                              key={file.id}
                              type="button"
                              className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 hover:bg-muted/60 transition-colors min-w-0"
                              onClick={() => handleSelectFile(file)}
                            >
                              <span className="shrink-0">{getFileIcon(file.name)}</span>
                              <span className="truncate flex-1 text-sm min-w-0">{file.name}</span>
                              <FileDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Resources root list */
                  <>
                    {filtered.folders.length === 0 && filtered.looseFiles.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">
                        {resources.length === 0 ? 'Chưa có tài nguyên nào' : 'Không tìm thấy'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {filtered.folders.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground px-2 mb-1.5 font-semibold uppercase tracking-wider">Folder</p>
                            {filtered.folders.map(folder => (
                              <button
                                key={folder.id}
                                type="button"
                                className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 bg-muted/30 hover:bg-muted/60 border border-border/50 transition-colors min-w-0"
                                onClick={() => { setOpenFolderId(folder.id); setSearchText(''); }}
                              >
                                <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" />
                                <span className="truncate flex-1 font-medium text-sm min-w-0">{folder.name}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                                  {folder.files.length} tệp
                                </span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}

                        {filtered.folders.length > 0 && filtered.looseFiles.length > 0 && (
                          <Separator />
                        )}

                        {filtered.looseFiles.length > 0 && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground px-2 mb-1.5 font-semibold uppercase tracking-wider">Tệp riêng lẻ</p>
                            {filtered.looseFiles.map(file => (
                              <button
                                key={file.id}
                                type="button"
                                className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 hover:bg-muted/60 transition-colors min-w-0"
                                onClick={() => handleSelectFile(file)}
                              >
                                <span className="shrink-0">{getFileIcon(file.name)}</span>
                                <span className="truncate flex-1 text-sm min-w-0">{file.name}</span>
                                <FileDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              ) : (
                /* === SUBMISSIONS TAB === */
                isLoadingSubs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : openSubId && openSub ? (
                  /* Level 3: Files inside a specific submission */
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800"
                      onClick={() => handleSelectAllSubFiles(openSub)}
                    >
                      <FolderInput className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium text-sm text-emerald-700 dark:text-emerald-300">
                        Chèn tất cả ({openSub.files.length} tệp)
                      </span>
                    </button>

                    <div className="pt-1">
                      <p className="text-xs text-muted-foreground px-2 mb-2 font-medium">Hoặc chọn 1 tệp:</p>
                      <div className="space-y-0.5">
                        {openSub.files.map((file, idx) => (
                          <button
                            key={`${openSub.id}_${idx}`}
                            type="button"
                            className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 hover:bg-muted/60 transition-colors min-w-0"
                            onClick={() => handleSelectSubFile(openSub.id, file)}
                          >
                            <span className="shrink-0">{getFileIcon(file.file_name)}</span>
                            <span className="truncate flex-1 text-sm min-w-0">{file.file_name}</span>
                            <FileDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : openTaskId && openTask ? (
                  /* Level 2: Submission attempts for a task */
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-2 mb-1.5 font-semibold uppercase tracking-wider">
                      Các lần nộp ({openTask.records.length})
                    </p>
                    {openTask.records.map((rec, idx) => (
                      <button
                        key={rec.id}
                        type="button"
                        className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 bg-muted/30 hover:bg-muted/60 border border-border/50 transition-colors min-w-0"
                        onClick={() => { setOpenSubId(rec.id); setSearchText(''); }}
                      >
                        <ClipboardList className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Lần {openTask.records.length - idx}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3 shrink-0" />
                              {rec.user_name}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3" />
                              {format(new Date(rec.submitted_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                          {rec.files.length} tệp
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Level 1: Task list */
                  <>
                    {filteredTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">
                        {tasksWithSubs.length === 0 ? 'Chưa có bài nộp nào' : 'Không tìm thấy'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground px-2 mb-1.5 font-semibold uppercase tracking-wider">Task có bài nộp</p>
                        {filteredTasks.map(task => (
                          <button
                            key={task.id}
                            type="button"
                            className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 bg-muted/30 hover:bg-muted/60 border border-border/50 transition-colors min-w-0"
                            onClick={() => { setOpenTaskId(task.id); setSearchText(''); }}
                          >
                            <ClipboardList className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="truncate flex-1 font-medium text-sm min-w-0">{task.title}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                              {task.records.length} lần nộp
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
