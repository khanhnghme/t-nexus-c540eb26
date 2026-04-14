import { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { deleteWithUndo } from '@/lib/deleteWithUndo';
import { useNavigate } from 'react-router-dom';
import { useFilePreview } from '@/contexts/FilePreviewContext';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import ResourceUploadDialog from '@/components/ResourceUploadDialog';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage, ensureR2Initialized } from '@/lib/r2Storage';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, File, FileText, Image as ImageIcon, Video, Music, Archive,
  FileSpreadsheet, Presentation, Trash2, Download, Search, FolderOpen,
  FolderPlus, Folder, Plus, Loader2, Eye, Filter, Calendar, User,
  ChevronRight, ChevronDown, MoreHorizontal, Pencil, Link as LinkIcon,
  ExternalLink, GripVertical, FolderInput, FolderOutput, CheckSquare, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectResource {
  id: string;
  group_id: string;
  name: string;
  file_path: string | null;
  storage_name: string | null;
  file_size: number;
  file_type: string | null;
  category: string | null;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  folder_id: string | null;
  resource_type: string;
  link_url: string | null;
  display_order: number;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ResourceFolder {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface ProjectResourcesProps {
  groupId: string;
  isLeader: boolean;
}

const CATEGORIES = [
  { value: 'general', label: 'Tài liệu chung', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'template', label: 'Mẫu/Template', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'reference', label: 'Tham khảo', color: 'bg-green-500/10 text-green-600 border-green-200' },
  { value: 'guide', label: 'Hướng dẫn', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { value: 'plugin', label: 'Plugin/Công cụ', color: 'bg-pink-500/10 text-pink-600 border-pink-200' },
];

function getFileIcon(fileName: string, size: 'sm' | 'md' = 'sm') {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  switch (ext) {
    case 'pdf': return <FileText className={cn(iconClass, 'text-red-500')} />;
    case 'doc': case 'docx': return <FileText className={cn(iconClass, 'text-blue-500')} />;
    case 'xls': case 'xlsx': case 'csv': return <FileSpreadsheet className={cn(iconClass, 'text-green-500')} />;
    case 'ppt': case 'pptx': return <Presentation className={cn(iconClass, 'text-orange-500')} />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return <ImageIcon className={cn(iconClass, 'text-purple-500')} />;
    case 'mp4': case 'webm': case 'mov': case 'avi': return <Video className={cn(iconClass, 'text-pink-500')} />;
    case 'mp3': case 'wav': case 'ogg': return <Music className={cn(iconClass, 'text-cyan-500')} />;
    case 'zip': case 'rar': case '7z': return <Archive className={cn(iconClass, 'text-amber-500')} />;
    default: return <File className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function ProjectResources({ groupId, isLeader }: ProjectResourcesProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { openFilePreview } = useFilePreview();
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadToFolder, setUploadToFolder] = useState<string | null>(null);
  
  // Folder dialog
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ResourceFolder | null>(null);
  
  // Delete dialog
  const [deleteResource, setDeleteResource] = useState<ProjectResource | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<ResourceFolder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Rename file dialog
  const [renameResource, setRenameResource] = useState<ProjectResource | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [batchMoveDialogOpen, setBatchMoveDialogOpen] = useState(false);
  const [batchMoveTarget, setBatchMoveTarget] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [downloadingFolderId, setDownloadingFolderId] = useState<string | null>(null);

  // Single item move dialog
  const [moveResource, setMoveResource] = useState<ProjectResource | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
    fetchFolders();
  }, [groupId]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_folders' as any)
        .select('*')
        .eq('group_id', groupId)
        .order('name', { ascending: true }) as any;
      if (error) throw error;
      setFolders((data || []) as ResourceFolder[]);
    } catch (error: any) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('project_resources')
        .select('*')
        .eq('group_id', groupId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const uploaderIds = [...new Set(data.map(r => r.uploaded_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', uploaderIds);
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setResources(data.map(r => ({
          ...r,
          folder_id: (r as any).folder_id || null,
          resource_type: (r as any).resource_type || 'file',
          link_url: (r as any).link_url || null,
          display_order: (r as any).display_order || 0,
          profiles: profilesMap.get(r.uploaded_by)
        })) as ProjectResource[]);
      } else {
        setResources([]);
      }
    } catch (error: any) {
      toast({ title: 'Lỗi', description: 'Không thể tải danh sách tài nguyên', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openUploadDialog = (folderId: string | null = null) => {
    setUploadToFolder(folderId);
    setIsUploadOpen(true);
  };

  // Download entire folder as ZIP
  const handleDownloadFolder = async (folder: ResourceFolder) => {
    const folderResources = resources.filter(r => r.folder_id === folder.id && r.resource_type === 'file' && r.file_path);
    if (folderResources.length === 0) {
      toast({ title: 'Thư mục trống', description: 'Không có file nào để tải', variant: 'destructive' });
      return;
    }
    setDownloadingFolderId(folder.id);
    try {
      const zip = new JSZip();
      let successCount = 0;
      await Promise.all(folderResources.map(async (resource) => {
        try {
          const response = await fetch(resource.file_path!);
          if (response.ok) {
            const blob = await response.blob();
            zip.file(resource.name, blob);
            successCount++;
          }
        } catch (err) {
          console.warn(`Failed to download: ${resource.name}`, err);
        }
      }));
      if (successCount === 0) {
        toast({ title: 'Lỗi', description: 'Không tải được file nào', variant: 'destructive' });
        return;
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folder.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Thành công', description: `Đã tải ${successCount} file trong thư mục "${folder.name}"` });
    } catch (error) {
      console.error('Error downloading folder:', error);
      toast({ title: 'Lỗi', description: 'Không thể tạo file ZIP', variant: 'destructive' });
    } finally {
      setDownloadingFolderId(null);
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = filteredResources.map(r => r.id);
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      clearSelection();
    } else {
      setIsSelectionMode(true);
    }
  };

  // Batch delete
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = new Set(selectedIds);
    const count = idsToDelete.size;
    const toDelete = resources.filter(r => idsToDelete.has(r.id));
    clearSelection();
    setBatchDeleteDialogOpen(false);

    deleteWithUndo({
      description: `Đã xóa ${count} tài nguyên`,
      onDelete: async () => {
        const storageFiles = toDelete
          .filter(r => r.resource_type === 'file' && r.storage_name)
          .map(r => r.storage_name!);
        if (storageFiles.length > 0) {
          await r2Storage.from('project-resources').remove(storageFiles);
        }
        const { error } = await supabase.from('project_resources').delete().in('id', Array.from(idsToDelete));
        if (error) throw error;
        if (user && profile) {
          await logActivity({
            userId: user.id, userName: profile.full_name,
            action: 'BATCH_DELETE_RESOURCES', actionType: 'resource',
            description: `Xóa hàng loạt ${count} tài nguyên: ${toDelete.map(r => r.name).join(', ')}`,
            groupId,
          });
        }
        fetchResources();
      },
      onUndo: () => {
        fetchResources();
      },
    });
  };

  // Batch move
  const handleBatchMove = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await supabase
          .from('project_resources')
          .update({ folder_id: batchMoveTarget } as any)
          .eq('id', id);
      }
      const targetName = batchMoveTarget
        ? folders.find(f => f.id === batchMoveTarget)?.name || 'thư mục'
        : 'ngoài thư mục';
      toast({ title: 'Thành công', description: `Đã di chuyển ${selectedIds.size} tài nguyên vào ${targetName}` });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'BATCH_MOVE_RESOURCES', actionType: 'resource',
          description: `Di chuyển hàng loạt ${selectedIds.size} tài nguyên vào ${targetName}`,
          groupId,
        });
      }
      clearSelection();
      setBatchMoveDialogOpen(false);
      fetchResources();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Handle resource drag & drop
  const handleResourceDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceFolderId = source.droppableId === 'root' ? null : source.droppableId;
    const destFolderId = destination.droppableId === 'root' ? null : destination.droppableId;

    const destResources = resources
      .filter(r => r.folder_id === destFolderId)
      .sort((a, b) => a.display_order - b.display_order);

    if (sourceFolderId === destFolderId) {
      const newOrder = [...destResources];
      const movedIndex = newOrder.findIndex(r => r.id === draggableId);
      if (movedIndex === -1) return;
      const [moved] = newOrder.splice(movedIndex, 1);
      newOrder.splice(destination.index, 0, moved);
      const updatedResources = resources.map(r => {
        const idx = newOrder.findIndex(nr => nr.id === r.id);
        if (idx !== -1) return { ...r, display_order: idx };
        return r;
      });
      setResources(updatedResources);
      try {
        for (let i = 0; i < newOrder.length; i++) {
          await supabase.from('project_resources').update({ display_order: i } as any).eq('id', newOrder[i].id);
        }
      } catch (e) { fetchResources(); }
    } else {
      const movedResource = resources.find(r => r.id === draggableId);
      if (!movedResource) return;
      const updatedResources = resources.map(r => {
        if (r.id === draggableId) return { ...r, folder_id: destFolderId, display_order: destination.index };
        return r;
      });
      setResources(updatedResources);
      try {
        await supabase.from('project_resources').update({ folder_id: destFolderId, display_order: destination.index } as any).eq('id', draggableId);
        const newDestResources = updatedResources.filter(r => r.folder_id === destFolderId).sort((a, b) => a.display_order - b.display_order);
        for (let i = 0; i < newDestResources.length; i++) {
          await supabase.from('project_resources').update({ display_order: i } as any).eq('id', newDestResources[i].id);
        }
      } catch (e) { fetchResources(); }
      toast({ title: 'Thành công', description: `Đã di chuyển "${movedResource.name}" ${destFolderId ? 'vào thư mục' : 'ra ngoài'}` });
    }
  }, [resources, fetchResources, toast]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Chưa đăng nhập');
      if (editingFolder) {
        const { error } = await (supabase.from('resource_folders' as any).update({ name: folderName.trim(), description: folderDescription || null }).eq('id', editingFolder.id) as any);
        if (error) throw error;
        toast({ title: 'Thành công', description: 'Đã cập nhật thư mục' });
        if (user && profile) {
          await logActivity({
            userId: user.id, userName: profile.full_name,
            action: 'UPDATE_FOLDER', actionType: 'resource',
            description: `Cập nhật thư mục "${editingFolder.name}" → "${folderName.trim()}"`,
            groupId,
          });
        }
      } else {
        const { error } = await (supabase.from('resource_folders' as any).insert({ group_id: groupId, name: folderName.trim(), description: folderDescription || null, created_by: userData.user.id }) as any);
        if (error) throw error;
        toast({ title: 'Thành công', description: 'Đã tạo thư mục mới' });
        if (user && profile) {
          await logActivity({
            userId: user.id, userName: profile.full_name,
            action: 'CREATE_FOLDER', actionType: 'resource',
            description: `Tạo thư mục mới "${folderName.trim()}"`,
            groupId,
          });
        }
      }
      setIsFolderDialogOpen(false);
      setFolderName('');
      setFolderDescription('');
      setEditingFolder(null);
      fetchFolders();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolder) return;
    const folderRef = deleteFolder;
    setDeleteFolder(null);

    deleteWithUndo({
      description: `Đã xóa thư mục "${folderRef.name}" và toàn bộ file bên trong`,
      onDelete: async () => {
        // Get all files in this folder
        const { data: folderFiles } = await supabase
          .from('project_resources')
          .select('id, storage_name, resource_type, name')
          .eq('folder_id', folderRef.id);

        // Delete storage files
        if (folderFiles && folderFiles.length > 0) {
          const storageFiles = folderFiles
            .filter(f => f.resource_type === 'file' && f.storage_name)
            .map(f => f.storage_name!);
          if (storageFiles.length > 0) {
            await r2Storage.from('project-resources').remove(storageFiles);
          }
          // Delete DB records for files
          await supabase.from('project_resources').delete().in('id', folderFiles.map(f => f.id));
        }

        // Delete folder itself
        await (supabase.from('resource_folders' as any).delete().eq('id', folderRef.id) as any);

        if (user && profile) {
          const fileNames = folderFiles?.map(f => f.name).join(', ') || '';
          await logActivity({
            userId: user.id, userName: profile.full_name,
            action: 'DELETE_FOLDER', actionType: 'resource',
            description: `Xóa thư mục "${folderRef.name}" cùng ${folderFiles?.length || 0} file${fileNames ? ': ' + fileNames : ''}`,
            groupId,
          });
        }
        fetchFolders();
        fetchResources();
      },
      onUndo: () => {
        fetchFolders();
        fetchResources();
      },
    });
  };

  const handleDelete = async () => {
    if (!deleteResource) return;
    const resourceRef = deleteResource;
    setDeleteResource(null);

    deleteWithUndo({
      description: `Đã xóa tài nguyên "${resourceRef.name}"`,
      onDelete: async () => {
        if (resourceRef.resource_type === 'file' && resourceRef.storage_name) {
          await r2Storage.from('project-resources').remove([resourceRef.storage_name]);
        }
        const { error: dbError } = await supabase.from('project_resources').delete().eq('id', resourceRef.id);
        if (dbError) throw dbError;
        if (user && profile) {
          await logActivity({
            userId: user.id, userName: profile.full_name,
            action: 'DELETE_RESOURCE', actionType: 'resource',
            description: `Xóa ${resourceRef.resource_type === 'link' ? 'link' : 'file'} "${resourceRef.name}" (${formatFileSize(resourceRef.file_size)})`,
            groupId,
          });
        }
        fetchResources();
      },
      onUndo: () => {
        fetchResources();
      },
    });
  };

  const handleRenameFile = async () => {
    if (!renameResource || !newFileName.trim()) return;
    setIsRenaming(true);
    try {
      let finalName = newFileName.trim();
      if (renameResource.resource_type === 'file') {
        const originalExt = renameResource.name.split('.').pop();
        const newNameWithoutExt = newFileName.trim().replace(/\.[^/.]+$/, '');
        finalName = originalExt ? `${newNameWithoutExt}.${originalExt}` : newNameWithoutExt;
      }
      const { error } = await supabase.from('project_resources').update({ name: finalName }).eq('id', renameResource.id);
      if (error) throw error;
      toast({ title: 'Thành công', description: 'Đã đổi tên' });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'RENAME_RESOURCE', actionType: 'resource',
          description: `Đổi tên "${renameResource.name}" → "${finalName}"`,
          groupId,
        });
      }
      setRenameResource(null);
      setNewFileName('');
      fetchResources();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleSingleMove = async () => {
    if (!moveResource) return;
    setIsBatchProcessing(true);
    try {
      await supabase
        .from('project_resources')
        .update({ folder_id: moveTarget } as any)
        .eq('id', moveResource.id);
      const targetName = moveTarget
        ? folders.find(f => f.id === moveTarget)?.name || 'thư mục'
        : 'ngoài thư mục';
      toast({ title: 'Thành công', description: `Đã di chuyển "${moveResource.name}" vào ${targetName}` });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'MOVE_RESOURCE', actionType: 'resource',
          description: `Di chuyển "${moveResource.name}" vào ${targetName}`,
          groupId,
        });
      }
      setMoveResource(null);
      fetchResources();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handlePreview = async (resource: ProjectResource, contextResources?: ProjectResource[]) => {
    if (isSelectionMode) return;
    if (resource.resource_type === 'link' && resource.link_url) {
      window.open(resource.link_url, '_blank');
    } else if (resource.file_path) {
      const storageName = resource.storage_name || 'project-resources';
      const { data } = await r2Storage.from(storageName).getPublicUrlAsync(resource.file_path);
      
      // Build siblingFiles from context resources (same folder)
      const fileResources = (contextResources || resources).filter(r => r.resource_type !== 'link' && r.file_path);
      const siblingFiles = fileResources.map(r => ({
        file_path: r.file_path!,
        file_name: r.name,
        file_size: r.file_size,
        storage_name: r.storage_name || 'project-resources',
      }));
      const activeIndex = fileResources.findIndex(r => r.id === resource.id);
      
      openFilePreview(data.publicUrl, resource.name, {
        siblingFiles: siblingFiles.length > 1 ? siblingFiles : undefined,
        activeIndex: activeIndex >= 0 ? activeIndex : 0,
      });
    }
  };

  const handleDownload = (resource: ProjectResource) => {
    if (resource.resource_type === 'link' && resource.link_url) {
      window.open(resource.link_url, '_blank');
    } else if (resource.file_path) {
      window.open(resource.file_path, '_blank');
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const openEditFolder = (folder: ResourceFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || '');
    setIsFolderDialogOpen(true);
  };

  // Filter resources
  const filteredResources = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const rootResources = filteredResources.filter(r => !r.folder_id);
  const getResourcesInFolder = (folderId: string) => 
    filteredResources.filter(r => r.folder_id === folderId);

  const renderResourceItem = (resource: ProjectResource, dragHandleProps?: any, isDragging?: boolean) => {
    const category = CATEGORIES.find(c => c.value === resource.category);
    const isLink = resource.resource_type === 'link';
    const isSelected = selectedIds.has(resource.id);
    
    return (
      <Card 
        key={resource.id} 
        className={cn(
          "group hover:shadow-md transition-all cursor-pointer",
          isDragging && "shadow-lg ring-2 ring-primary/30",
          isSelected && "ring-2 ring-primary border-primary bg-primary/5",
          !isSelected && "hover:border-primary/30"
        )}
        onClick={() => {
          if (isSelectionMode) {
            toggleSelect(resource.id);
          } else {
            handlePreview(resource);
          }
        }}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {isSelectionMode && (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(resource.id)}
                />
              </div>
            )}
            {isLeader && !isSelectionMode && dragHandleProps && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-muted rounded touch-none shrink-0" onClick={(e) => e.stopPropagation()}>
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
              isLink 
                ? "bg-gradient-to-br from-blue-500/20 to-blue-500/10 border-blue-200" 
                : "bg-gradient-to-br from-primary/10 to-primary/5"
            )}>
              {isLink ? <LinkIcon className="w-5 h-5 text-blue-600" /> : getFileIcon(resource.name, 'md')}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate max-w-[200px] sm:max-w-none" title={resource.name}>
                  {resource.name}
                </h4>
                {isLink && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-blue-500/10 text-blue-600 border-blue-200">Link</Badge>
                )}
                {category && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", category.color)}>{category.label}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {!isLink && (
                  <span className="flex items-center gap-1"><File className="w-3 h-3" />{formatFileSize(resource.file_size)}</span>
                )}
                {isLink && resource.link_url && (
                  <span className="flex items-center gap-1 truncate max-w-[150px]" title={resource.link_url}>
                    <ExternalLink className="w-3 h-3" />{(() => { try { return new URL(resource.link_url).hostname; } catch { return resource.link_url; } })()}
                  </span>
                )}
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(resource.created_at), 'dd/MM/yyyy', { locale: vi })}</span>
                <span className="flex items-center gap-1 hidden sm:flex"><User className="w-3 h-3" />{resource.profiles?.full_name || 'Unknown'}</span>
              </div>
            </div>
            
            {!isSelectionMode && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handlePreview(resource); }} title={isLink ? "Mở link" : "Xem trước"}>
                  {isLink ? <ExternalLink className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                {!isLink && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDownload(resource); }} title="Tải xuống">
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                {isLeader && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()} title="Thêm thao tác">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { 
                        e.stopPropagation(); 
                        setNewFileName(isLink ? resource.name : (resource.name.substring(0, resource.name.lastIndexOf('.')) || resource.name));
                        setRenameResource(resource); 
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />Đổi tên
                      </DropdownMenuItem>
                      {folders.length > 0 && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setMoveTarget(resource.folder_id || null);
                          setMoveResource(resource);
                        }}>
                          <FolderInput className="w-4 h-4 mr-2" />Di chuyển vào thư mục
                        </DropdownMenuItem>
                      )}
                      {resource.folder_id && (
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await supabase.from('project_resources').update({ folder_id: null } as any).eq('id', resource.id);
                            toast({ title: 'Thành công', description: `Đã di chuyển "${resource.name}" ra ngoài thư mục` });
                            fetchResources();
                          } catch (err: any) {
                            toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
                          }
                        }}>
                          <FolderOutput className="w-4 h-4 mr-2" />Đưa ra ngoài thư mục
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteResource(resource); }}>
                        <Trash2 className="w-4 h-4 mr-2" />Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Dialog */}
      <ResourceUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        groupId={groupId}
        folderId={uploadToFolder}
        folderName={folders.find(f => f.id === uploadToFolder)?.name}
        onSuccess={() => { fetchResources(); }}
        onClose={() => { setIsUploadOpen(false); setUploadToFolder(null); }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Tài nguyên dự án
            <Badge variant="secondary" className="ml-2">{resources.length}</Badge>
          </h2>
        </div>
        
        {isLeader && (
          <div className="flex items-center gap-2">
            {resources.length > 0 && (
              <Button 
                variant={isSelectionMode ? "default" : "outline"} 
                size="sm" 
                onClick={toggleSelectionMode}
                className="gap-1"
              >
                <CheckSquare className="w-4 h-4" />
                {isSelectionMode ? 'Hủy chọn' : 'Chọn nhiều'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => {
              setEditingFolder(null);
              setFolderName('');
              setFolderDescription('');
              setIsFolderDialogOpen(true);
            }}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Tạo thư mục
            </Button>
            <Button size="sm" onClick={() => openUploadDialog(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm tài nguyên
            </Button>
          </div>
        )}
      </div>

      {/* Batch action bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2">
          <Badge variant="default" className="text-sm">
            {selectedIds.size} đã chọn
          </Badge>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={selectAll} className="gap-1">
              <CheckSquare className="w-3.5 h-3.5" />
              Chọn tất cả ({filteredResources.length})
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setBatchMoveTarget(null);
                setBatchMoveDialogOpen(true);
              }}
              className="gap-1"
            >
              <FolderInput className="w-3.5 h-3.5" />
              Di chuyển
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setBatchDeleteDialogOpen(true)}
              className="gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa ({selectedIds.size})
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="gap-1">
              <X className="w-3.5 h-3.5" />
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm tài nguyên..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Phân loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Folders and Resources */}
      {folders.length === 0 && filteredResources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg">Chưa có tài nguyên</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isLeader ? 'Tải lên tài liệu, thêm link hoặc tạo thư mục cho dự án' : 'Chưa có tài nguyên nào được chia sẻ'}
            </p>
            {isLeader && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsFolderDialogOpen(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />Tạo thư mục
                </Button>
                <Button onClick={() => openUploadDialog(null)}>
                  <Upload className="w-4 h-4 mr-2" />Tải file lên
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleResourceDragEnd}>
          <div className="space-y-3">
            {/* Folders */}
            {folders.map(folder => {
              const folderResources = getResourcesInFolder(folder.id).sort((a, b) => a.display_order - b.display_order);
              const isExpanded = expandedFolders.has(folder.id);
              const selectedInFolder = folderResources.filter(r => selectedIds.has(r.id)).length;
              
              return (
                <Collapsible key={folder.id} open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        {isSelectionMode && (
                          <div className="shrink-0" onClick={(e) => {
                            e.stopPropagation();
                            // Toggle all resources in folder
                            const folderIds = folderResources.map(r => r.id);
                            const allSelected = folderIds.every(id => selectedIds.has(id));
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (allSelected) {
                                folderIds.forEach(id => next.delete(id));
                              } else {
                                folderIds.forEach(id => next.add(id));
                              }
                              return next;
                            });
                          }}>
                            <Checkbox
                              checked={folderResources.length > 0 && folderResources.every(r => selectedIds.has(r.id))}
                              className="mt-0.5"
                            />
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center shrink-0 border border-amber-200">
                          <Folder className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{folder.name}</h4>
                            <Badge variant="secondary" className="text-[10px]">{folderResources.length} file</Badge>
                            {selectedInFolder > 0 && (
                              <Badge variant="default" className="text-[10px]">{selectedInFolder} đã chọn</Badge>
                            )}
                          </div>
                          {folder.description && <p className="text-xs text-muted-foreground truncate">{folder.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Download folder button - visible to all */}
                          {!isSelectionMode && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={downloadingFolderId === folder.id}
                              onClick={(e) => { e.stopPropagation(); handleDownloadFolder(folder); }}
                              title="Tải toàn bộ thư mục"
                            >
                              {downloadingFolderId === folder.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {isLeader && !isSelectionMode && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openUploadDialog(folder.id); }}>
                                  <Upload className="w-4 h-4 mr-2" />Thêm tài nguyên vào đây
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadFolder(folder); }} disabled={downloadingFolderId === folder.id}>
                                  <Download className="w-4 h-4 mr-2" />Tải toàn bộ thư mục
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }}>
                                  <Pencil className="w-4 h-4 mr-2" />Sửa thư mục
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteFolder(folder); }}>
                                  <Trash2 className="w-4 h-4 mr-2" />Xóa thư mục
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <Droppable droppableId={folder.id}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}
                            className={cn("border-t bg-muted/30 p-2 space-y-2 min-h-[40px]", snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-primary/20")}
                          >
                            {folderResources.length === 0 && !snapshot.isDraggingOver ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                Thư mục trống - kéo tài nguyên vào đây
                                {isLeader && !isSelectionMode && (
                                  <div className="flex justify-center gap-2 mt-2">
                                    <Button variant="link" size="sm" onClick={() => openUploadDialog(folder.id)}>
                                      <Upload className="w-3 h-3 mr-1" />Thêm tài nguyên
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              folderResources.map((resource, index) => (
                                <Draggable key={resource.id} draggableId={resource.id} index={index} isDragDisabled={!isLeader || isSelectionMode}>
                                  {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps}>
                                      {renderResourceItem(resource, provided.dragHandleProps, snapshot.isDragging)}
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}

            {/* Root level resources */}
            <Droppable droppableId="root">
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={cn("space-y-2 min-h-[20px]", snapshot.isDraggingOver && "bg-primary/5 rounded-lg p-2 ring-1 ring-primary/20")}
                >
                  {folders.length > 0 && rootResources.length > 0 && (
                    <h3 className="text-sm font-medium text-muted-foreground px-1">File không thuộc thư mục</h3>
                  )}
                  {rootResources.sort((a, b) => a.display_order - b.display_order).map((resource, index) => (
                    <Draggable key={resource.id} draggableId={resource.id} index={index} isDragDisabled={!isLeader || isSelectionMode}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          {renderResourceItem(resource, provided.dragHandleProps, snapshot.isDragging)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}

      {/* Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              {editingFolder ? 'Sửa thư mục' : 'Tạo thư mục mới'}
            </DialogTitle>
            <DialogDescription>Tổ chức tài nguyên theo thư mục</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên thư mục</Label>
              <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="VD: Tài liệu tham khảo..." />
            </div>
            <div className="space-y-2">
              <Label>Mô tả (tùy chọn)</Label>
              <Input value={folderDescription} onChange={(e) => setFolderDescription(e.target.value)} placeholder="Mô tả ngắn về thư mục..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateFolder} disabled={isCreatingFolder || !folderName.trim()} className="gap-2">
              {isCreatingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
              {editingFolder ? 'Cập nhật' : 'Tạo thư mục'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Resource Confirmation */}
      <AlertDialog open={!!deleteResource} onOpenChange={() => setDeleteResource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa {deleteResource?.resource_type === 'link' ? 'link' : 'file'}</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc muốn xóa "{deleteResource?.name}"? Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xóa'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!deleteFolder} onOpenChange={() => setDeleteFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thư mục</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc muốn xóa thư mục "{deleteFolder?.name}"? Các file trong thư mục sẽ được chuyển về gốc.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xóa'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename File Dialog */}
      <Dialog open={!!renameResource} onOpenChange={() => setRenameResource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Đổi tên {renameResource?.resource_type === 'link' ? 'link' : 'file'}
            </DialogTitle>
            <DialogDescription>
              {renameResource?.resource_type === 'link' ? 'Nhập tên mới cho link' : 'Nhập tên mới cho file (phần mở rộng sẽ được giữ nguyên)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên mới</Label>
              <div className="flex items-center gap-2">
                <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="Nhập tên..." onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()} autoFocus />
                {renameResource?.resource_type === 'file' && (
                  <span className="text-sm text-muted-foreground shrink-0">.{renameResource?.name.split('.').pop()}</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRenameResource(null)}>Hủy</Button>
            <Button onClick={handleRenameFile} disabled={isRenaming || !newFileName.trim()} className="gap-2">
              {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              Đổi tên
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa <strong>{selectedIds.size}</strong> tài nguyên đã chọn? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchProcessing}>Hủy</AlertDialogCancel>
            <Button onClick={handleBatchDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isBatchProcessing}>
              {isBatchProcessing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Đang xóa...</> : `Xóa ${selectedIds.size} tài nguyên`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Move Dialog */}
      <Dialog open={batchMoveDialogOpen} onOpenChange={setBatchMoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderInput className="w-5 h-5 text-primary" />
              Di chuyển {selectedIds.size} tài nguyên
            </DialogTitle>
            <DialogDescription>
              Chọn thư mục đích hoặc di chuyển ra ngoài
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                batchMoveTarget === null ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
              onClick={() => setBatchMoveTarget(null)}
            >
              <FolderOutput className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Ngoài thư mục (gốc)</p>
                <p className="text-xs text-muted-foreground">Di chuyển ra khỏi tất cả thư mục</p>
              </div>
            </div>
            {folders.map(folder => (
              <div
                key={folder.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  batchMoveTarget === folder.id ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
                onClick={() => setBatchMoveTarget(folder.id)}
              >
                <Folder className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">{folder.name}</p>
                  {folder.description && <p className="text-xs text-muted-foreground">{folder.description}</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBatchMoveDialogOpen(false)} disabled={isBatchProcessing}>Hủy</Button>
            <Button onClick={handleBatchMove} disabled={isBatchProcessing} className="gap-2">
              {isBatchProcessing ? <><Loader2 className="w-4 h-4 animate-spin" />Đang xử lý...</> : <><FolderInput className="w-4 h-4" />Di chuyển</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Item Move Dialog */}
      <Dialog open={!!moveResource} onOpenChange={() => setMoveResource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderInput className="w-5 h-5 text-primary" />
              Di chuyển &quot;{moveResource?.name}&quot;
            </DialogTitle>
            <DialogDescription>
              Chọn thư mục đích
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                moveTarget === null ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
              onClick={() => setMoveTarget(null)}
            >
              <FolderOutput className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Ngoài thư mục (gốc)</p>
                <p className="text-xs text-muted-foreground">Di chuyển ra khỏi tất cả thư mục</p>
              </div>
            </div>
            {folders.map(folder => (
              <div
                key={folder.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  moveTarget === folder.id ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:bg-muted/50",
                  moveResource?.folder_id === folder.id && "opacity-50"
                )}
                onClick={() => setMoveTarget(folder.id)}
              >
                <Folder className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">{folder.name}</p>
                  {folder.description && <p className="text-xs text-muted-foreground">{folder.description}</p>}
                  {moveResource?.folder_id === folder.id && <p className="text-xs text-primary">Đang ở thư mục này</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMoveResource(null)} disabled={isBatchProcessing}>Hủy</Button>
            <Button 
              onClick={handleSingleMove} 
              disabled={isBatchProcessing || moveTarget === (moveResource?.folder_id || null)} 
              className="gap-2"
            >
              {isBatchProcessing ? <><Loader2 className="w-4 h-4 animate-spin" />Đang xử lý...</> : <><FolderInput className="w-4 h-4" />Di chuyển</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
