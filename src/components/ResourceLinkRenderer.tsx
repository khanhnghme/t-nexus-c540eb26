import { useNavigate } from 'react-router-dom';
import { useFilePreview } from '@/contexts/FilePreviewContext';
import { r2Storage, normalizeStorageUrl, ensureR2Initialized } from '@/lib/r2Storage';
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
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceLinkRendererProps {
  content: string;
  className?: string;
  /** max width for displayed file name inside the chip */
  nameMaxWidth?: string;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconClass = 'w-3.5 h-3.5';
  
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

// Extract filename from a storage URL
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return decodeURIComponent(fileName);
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'file';
  }
}

// Clean up filename for display
function cleanFileName(name: string): string {
  // Remove # prefix if present
  let cleaned = name.startsWith('#') ? name.slice(1) : name;
  
  // If it looks like a storage name (timestamp-randomchars.ext), extract just extension
  const storagePattern = /^\d{13}-[a-z0-9]+\./i;
  if (storagePattern.test(cleaned)) {
    const ext = cleaned.split('.').pop();
    return `file.${ext}`;
  }
  
  return cleaned;
}

export default function ResourceLinkRenderer({ content, className, nameMaxWidth = '180px' }: ResourceLinkRendererProps) {
  const navigate = useNavigate();
  const { openFilePreview } = useFilePreview();
  
  if (!content) return null;
  
  interface MatchInfo {
    start: number;
    end: number;
    fileName: string;
    url: string;
  }
  
  const allMatches: MatchInfo[] = [];
  
  // Pattern 1: [#filename](url) - markdown style
  // Also supports short references: [#name](res:<uuid>)
  const markdownRegex = /\[#([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(content)) !== null) {
    allMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      fileName: match[1],
      url: match[2]
    });
  }
  
  // Pattern 2: Standalone (https://...supabase...storage...) - parenthesized URLs  
  const parenUrlRegex = /\((https:\/\/[^)]*supabase[^)]*\/storage\/[^)]+)\)/g;
  while ((match = parenUrlRegex.exec(content)) !== null) {
    const overlaps = allMatches.some(m => 
      (match!.index >= m.start && match!.index < m.end) ||
      (match!.index + match![0].length > m.start && match!.index + match![0].length <= m.end)
    );
    if (!overlaps) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        fileName: extractFileNameFromUrl(match[1]),
        url: match[1]
      });
    }
  }
  
  // Pattern 3: Raw supabase storage URLs
  const rawUrlRegex = /(https:\/\/[^\s]*supabase[^\s]*\/storage\/v1\/object\/[^\s\])]+)/g;
  while ((match = rawUrlRegex.exec(content)) !== null) {
    const overlaps = allMatches.some(m => 
      (match!.index >= m.start && match!.index < m.end) ||
      (match!.index + match![0].length > m.start && match!.index + match![0].length <= m.end)
    );
    if (!overlaps) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        fileName: extractFileNameFromUrl(match[1]),
        url: match[1]
      });
    }
  }
  
  // Sort by position
  allMatches.sort((a, b) => a.start - b.start);
  
  // Build parts
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  
  allMatches.forEach((m, idx) => {
    if (m.start > lastIndex) {
      parts.push(content.slice(lastIndex, m.start));
    }
    
    const displayName = cleanFileName(m.fileName);

    // Check if this is a plain external link (not a file reference)
    const isExternalLink = !m.url.startsWith('res:') && !m.url.startsWith('sub:') &&
      !m.url.includes('/storage/') &&
      (m.url.startsWith('http://') || m.url.startsWith('https://'));
    
    // Clickable card/chip
    parts.push(
        <button
        key={`resource-${idx}`}
        type="button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isExternalLink) {
            window.open(m.url, '_blank', 'noopener,noreferrer');
            return;
          }
          // Resolve actual file URL
          let fileUrl = m.url;
          let fileName = displayName;
          if (m.url.startsWith('res:')) {
            const resId = m.url.slice('res:'.length);
            const { data } = await supabase.from('project_resources').select('file_path, storage_name, name').eq('id', resId).maybeSingle();
            if (data?.file_path) {
              const storageName = data.storage_name || 'project-resources';
              const result = await r2Storage.from(storageName).getPublicUrlAsync(data.file_path);
              fileUrl = result.data.publicUrl;
              fileName = data.name || displayName;
            }
          } else if (m.url.startsWith('sub:')) {
            const subId = m.url.slice('sub:'.length);
            const { data } = await supabase.from('submission_history').select('file_path, file_name').eq('id', subId).maybeSingle();
            if (data?.file_path) {
              const result = await r2Storage.from('task-submissions').getPublicUrlAsync(data.file_path);
              fileUrl = result.data.publicUrl;
              fileName = data.file_name || displayName;
            }
          } else {
            fileUrl = normalizeStorageUrl(m.url) || m.url;
          }
          openFilePreview(fileUrl, fileName);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 my-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer shadow-sm",
          m.url.startsWith('sub:')
            ? "bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900/70 dark:border-emerald-800 dark:text-emerald-300"
            : "bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 dark:bg-sky-950 dark:hover:bg-sky-900/70 dark:border-sky-800 dark:text-sky-300"
        )}
        title={isExternalLink ? `Mở: ${m.url}` : `Xem: ${displayName}`}
      >
        {getFileIcon(displayName)}
          <span className="truncate" style={{ maxWidth: nameMaxWidth }}>{displayName}</span>
        <ExternalLink className="w-3 h-3 opacity-50" />
      </button>
    );
    
    lastIndex = m.end;
  });
  
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  if (parts.length === 0) {
    return <span className={className}>{content}</span>;
  }
  
  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {parts.map((part, index) => 
        typeof part === 'string' ? <span key={index}>{part}</span> : part
      )}
    </span>
  );
}
