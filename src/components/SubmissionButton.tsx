import { useNavigate } from 'react-router-dom';
import { r2Storage } from '@/lib/r2Storage';
import { useFilePreview } from '@/contexts/FilePreviewContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ExternalLink, 
  ChevronDown, 
  Eye, 
  File, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Image as ImageIcon 
} from 'lucide-react';

interface SubmissionItem {
  title?: string;
  url?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  storage_name?: string;
  drive_file_id?: string;
  mime_type?: string;
  icon_url?: string;
  type?: 'link' | 'file' | 'drive';
}

interface SubmissionButtonProps {
  submissionLink: string | null;
  variant?: 'default' | 'compact';
  onStopPropagation?: boolean;
  taskId?: string;
  groupId?: string;
  projectSlug?: string;
  taskSlug?: string;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="w-3 h-3 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-3 h-3 text-blue-500" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="w-3 h-3 text-green-500" />;
    case 'ppt':
    case 'pptx':
      return <Presentation className="w-3 h-3 text-orange-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <ImageIcon className="w-3 h-3 text-purple-500" />;
    default:
      return <File className="w-3 h-3 text-muted-foreground" />;
  }
};

export function parseSubmissionLinks(submissionLink: string | null): SubmissionItem[] {
  if (!submissionLink) return [];
  
  try {
    const parsed = JSON.parse(submissionLink);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        ...item,
        type: item.type || (item.file_path ? 'file' : item.drive_file_id ? 'drive' : 'link')
      }));
    }
    return [{ title: 'Bài nộp', url: submissionLink, type: 'link' }];
  } catch {
    return [{ title: 'Bài nộp', url: submissionLink, type: 'link' }];
  }
}

export default function SubmissionButton({ 
  submissionLink, 
  variant = 'default',
  onStopPropagation = true,
  taskId,
  groupId,
  projectSlug,
  taskSlug,
}: SubmissionButtonProps) {
  const navigate = useNavigate();
  const { openFilePreview } = useFilePreview();
  
  if (!submissionLink) {
    return variant === 'compact' ? (
      <span className="inline-flex h-7 w-[104px] items-center justify-center text-[10px] text-muted-foreground whitespace-nowrap">—</span>
    ) : null;
  }

  const items = parseSubmissionLinks(submissionLink);
  
  if (items.length === 0) {
    return variant === 'compact' ? (
      <span className="inline-flex h-7 w-[104px] items-center justify-center text-[10px] text-muted-foreground whitespace-nowrap">—</span>
    ) : null;
  }

  const fileItems = items.filter(i => i.type === 'file' && i.file_path);
  const siblingFiles = fileItems.map(i => ({
    file_path: i.file_path!,
    file_name: i.file_name || 'file',
    file_size: i.file_size || 0,
    storage_name: i.storage_name,
  }));

  const handleOpenItem = (item: SubmissionItem, e?: React.MouseEvent) => {
    if (onStopPropagation && e) {
      e.stopPropagation();
    }
    
    if (item.type === 'drive' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else if (item.type === 'file' && item.file_path) {
      const clickedIndex = siblingFiles.findIndex(f => f.file_path === item.file_path);
      const { data } = r2Storage.from('task-submissions').getPublicUrl(item.file_path);
      openFilePreview(data.publicUrl, item.file_name || 'file', {
        siblingFiles,
        activeIndex: clickedIndex >= 0 ? clickedIndex : 0,
        projectSlug,
        taskSlug,
      });
    } else if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (items.length === 1) {
    const item = items[0];
    const isFile = item.type === 'file';
    const isDrive = item.type === 'drive';
    
    return (
      <Button
        variant="outline"
        size="sm"
        className={`h-7 text-xs px-2 gap-1 text-primary whitespace-nowrap ${
          variant === 'compact' ? 'w-[104px] justify-center' : ''
        }`}
        onClick={(e) => handleOpenItem(item, e)}
      >
        {isDrive ? (
          <>
            <img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" alt="" className="w-3 h-3" />
            {variant === 'compact' ? 'Drive' : 'Xem Drive'}
          </>
        ) : isFile ? (
          <>
            <Eye className="w-3 h-3" />
            {variant === 'compact' ? 'File' : 'Xem file'}
          </>
        ) : (
          <>
            <ExternalLink className="w-3 h-3" />
            {variant === 'compact' ? 'Xem' : 'Xem bài nộp'}
          </>
        )}
      </Button>
    );
  }

  // Multiple items
  const hasFiles = items.some(i => i.type === 'file');
  const hasLinks = items.some(i => i.type === 'link');
  const hasDrive = items.some(i => i.type === 'drive');
  const filesCount = items.filter(i => i.type === 'file').length;
  const linksCount = items.filter(i => i.type === 'link').length;
  const driveCount = items.filter(i => i.type === 'drive').length;
  
  let label = `Xem (${items.length})`;
  const parts: string[] = [];
  if (filesCount > 0) parts.push(`${filesCount}F`);
  if (driveCount > 0) parts.push(`${driveCount}D`);
  if (linksCount > 0) parts.push(`${linksCount}L`);
  if (parts.length > 1) {
    label = parts.join('+');
  } else if (hasFiles) {
    label = `${filesCount} file`;
  } else if (hasDrive) {
    label = `${driveCount} drive`;
  } else {
    label = `${linksCount} link`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 text-xs px-2 gap-1 text-primary whitespace-nowrap overflow-hidden ${
            variant === 'compact' ? 'w-[104px] justify-center' : ''
          }`}
          onClick={(e) => onStopPropagation && e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className={variant === 'compact' ? 'truncate max-w-[56px]' : ''}>
            {variant === 'compact' ? label : `Xem bài (${items.length})`}
          </span>
          <ChevronDown className="w-3 h-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-popover min-w-[200px]">
        {items.map((item, i) => {
          const isFile = item.type === 'file';
          const isDrive = item.type === 'drive';
          return (
            <DropdownMenuItem 
              key={i}
              onClick={(e) => handleOpenItem(item, e)}
              className="text-xs cursor-pointer"
            >
              {isDrive ? (
                <>
                  <img src={item.icon_url || "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png"} alt="" className="w-3 h-3" />
                  <span className="ml-2 truncate">{item.title || 'Drive file'}</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </>
              ) : isFile ? (
                <>
                  {getFileIcon(item.file_name || 'file')}
                  <span className="ml-2 truncate">{item.title || item.file_name || 'File'}</span>
                  <Eye className="w-3 h-3 ml-auto opacity-50" />
                </>
              ) : (
                <>
                  <ExternalLink className="w-3 h-3 mr-2" />
                  <span className="truncate">{item.title || `Link ${i + 1}`}</span>
                </>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
