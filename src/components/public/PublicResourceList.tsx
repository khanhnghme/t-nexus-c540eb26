import { useState, useEffect } from 'react';
import { r2Storage } from '@/lib/r2Storage';
import { useNavigate } from 'react-router-dom';
import { useFilePreview } from '@/contexts/FilePreviewContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  FileSpreadsheet,
  Presentation,
  Download, 
  Search, 
  Folder,
  Loader2,
  Eye,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ProjectResource {
  id: string;
  group_id: string;
  name: string;
  file_path: string | null;
  file_size: number;
  file_type: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
  folder_id: string | null;
  resource_type: string;
  link_url: string | null;
}

interface ResourceFolder {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface PublicResourceListProps {
  groupId: string;
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function PublicResourceList({ groupId }: PublicResourceListProps) {
  const navigate = useNavigate();
  const { openFilePreview } = useFilePreview();
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      // Fetch folders
      const { data: foldersData } = await supabase
        .from('resource_folders')
        .select('id, group_id, name, description, created_at')
        .eq('group_id', groupId)
        .order('name', { ascending: true });
      
      if (foldersData) setFolders(foldersData as ResourceFolder[]);

      // Fetch resources
      const { data: resourcesData } = await supabase
        .from('project_resources')
        .select('id, group_id, name, file_path, file_size, file_type, category, description, created_at, folder_id, resource_type, link_url')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      
      if (resourcesData) setResources(resourcesData as ProjectResource[]);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (resource: ProjectResource) => {
    // If it's a link resource, open directly in new tab
    if (resource.resource_type === 'link' && resource.link_url) {
      window.open(resource.link_url, '_blank', 'noopener,noreferrer');
      return;
    }
    // Otherwise open file preview
    if (resource.file_path) {
      const storageName = (resource as any).storage_name || 'project-resources';
      const { data } = await r2Storage.from(storageName).getPublicUrlAsync(resource.file_path);
      
      // Build siblingFiles from all file resources
      const fileResources = resources.filter(r => r.resource_type !== 'link' && r.file_path);
      const siblings = fileResources.map(r => ({
        file_path: r.file_path!,
        file_name: r.name,
        file_size: r.file_size,
        storage_name: (r as any).storage_name || 'project-resources',
      }));
      const idx = fileResources.findIndex(r => r.id === resource.id);
      
      openFilePreview(data.publicUrl, resource.name, {
        siblingFiles: siblings.length > 1 ? siblings : undefined,
        activeIndex: idx >= 0 ? idx : 0,
      });
    }
  };

  const handleDownload = (e: React.MouseEvent, resource: ProjectResource) => {
    e.stopPropagation();
    if (resource.resource_type === 'link' && resource.link_url) {
      window.open(resource.link_url, '_blank', 'noopener,noreferrer');
    } else if (resource.file_path) {
      window.open(resource.file_path, '_blank');
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Filter resources
  const filteredResources = resources.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const rootResources = filteredResources.filter(r => !r.folder_id);
  const getResourcesInFolder = (folderId: string) => 
    filteredResources.filter(r => r.folder_id === folderId);

  const renderResourceItem = (resource: ProjectResource) => {
    const category = CATEGORIES.find(c => c.value === resource.category);
    
    return (
      <Card 
        key={resource.id} 
        className="group hover:shadow-md transition-all hover:border-primary/30 cursor-pointer"
        onClick={() => handlePreview(resource)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0 border">
              {resource.resource_type === 'link' ? <LinkIcon className="w-5 h-5 text-primary" /> : getFileIcon(resource.name, 'md')}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">{resource.name}</h4>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {resource.resource_type === 'link' ? (
                  <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" />Link</span>
                ) : (
                  <span>{formatFileSize(resource.file_size)}</span>
                )}
                <span>•</span>
                <span>{format(new Date(resource.created_at), 'dd/MM/yyyy', { locale: vi })}</span>
              </div>
              {category && (
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 mt-1', category.color)}>
                  {category.label}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => handleDownload(e, resource)}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(resource);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-medium text-lg mb-1">Chưa có tài nguyên</h3>
          <p className="text-sm text-muted-foreground">
            Dự án này chưa có tài nguyên được chia sẻ công khai
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm tài nguyên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <File className="w-4 h-4" />
          {resources.length} tài nguyên
        </span>
        {folders.length > 0 && (
          <span className="flex items-center gap-1.5">
            <Folder className="w-4 h-4" />
            {folders.length} thư mục
          </span>
        )}
      </div>

      {/* Folders */}
      {folders.map(folder => {
        const folderResources = getResourcesInFolder(folder.id);
        const isExpanded = expandedFolders.has(folder.id);
        
        if (folderResources.length === 0 && searchQuery) return null;
        
        return (
          <Collapsible 
            key={folder.id} 
            open={isExpanded} 
            onOpenChange={() => toggleFolder(folder.id)}
          >
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 border border-warning/20">
                      <Folder className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{folder.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {folderResources.length} tài nguyên
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-2 space-y-2 border-l-2 border-warning/20 pl-4">
                {folderResources.map(renderResourceItem)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Root Resources */}
      {rootResources.length > 0 && (
        <div className="space-y-2">
          {folders.length > 0 && (
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-4">
              <File className="w-4 h-4" />
              Tài nguyên khác
            </h3>
          )}
          {rootResources.map(renderResourceItem)}
        </div>
      )}
    </div>
  );
}
