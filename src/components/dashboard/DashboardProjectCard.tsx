import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Calendar, Globe, Clock, Palette, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fixStorageUrl } from '@/lib/urlUtils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Group } from '@/types/database';

interface DashboardProjectCardProps {
  group: Group;
  isHidden?: boolean;
  isPending?: boolean;
  isStarred?: boolean;
  onToggleHide?: (groupId: string) => void;
  onToggleStar?: (groupId: string) => void;
}

const NOTION_COVERS = [
  { bg: '#f7f6f3', text: '#9b9a97' },
  { bg: '#f1f1ef', text: '#a4a4a2' },
  { bg: '#f3f0e7', text: '#b0a890' },
  { bg: '#eef0e8', text: '#8b9876' },
  { bg: '#f0eeeb', text: '#a09b8e' },
  { bg: '#ece9e2', text: '#a49e8e' },
  { bg: '#f1eff5', text: '#9b94a7' },
  { bg: '#edf3f0', text: '#7fa090' },
];

function nameToStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return NOTION_COVERS[Math.abs(hash) % NOTION_COVERS.length];
}

function NameCover({ name }: { name: string }) {
  const style = nameToStyle(name);
  const initial = name.trim()[0]?.toUpperCase() || '?';
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: style.bg }}>
      <div className="flex flex-col items-center gap-1.5">
        <FileText className="w-6 h-6" style={{ color: style.text }} strokeWidth={1.5} />
        <span className="text-xs font-medium tracking-wide" style={{ color: style.text }}>{initial}</span>
      </div>
    </div>
  );
}

function DashboardProjectCardInner({ group, isHidden, isPending, isStarred, onToggleHide, onToggleStar }: DashboardProjectCardProps) {
  const [imgError, setImgError] = useState(false);
  const { activeWorkspace } = useWorkspace();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const showNameCover = !group.image_url || imgError;

  const handleToggleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleStar?.(group.id);
  };

  const Wrapper = isPending ? 'div' : Link;
  const wrapperProps = isPending
    ? {}
    : { to: activeWorkspace?.short_id
        ? (group.project_mode === 'custom'
            ? `/pa/ws-${activeWorkspace.short_id}/${group.slug}`
            : `/pr/ws-${activeWorkspace.short_id}/${group.slug}`)
        : `/p/${group.slug}` };

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={`group relative block rounded-2xl overflow-hidden bg-card border border-border transition-all duration-fast ease-in-out ${
        isPending ? 'opacity-60 cursor-default' : 'hover-lift hover:border-border'
      } ${isHidden ? 'opacity-60' : ''}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {showNameCover ? (
          <NameCover name={group.name} />
        ) : (
          <img
            src={fixStorageUrl(group.image_url!) || ''}
            alt={group.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${!isPending ? 'group-hover:scale-105' : ''}`}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        {isPending && (
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
            <Badge className="bg-warning text-warning-foreground gap-1 text-xs shadow-lg">
              <Clock className="w-3 h-3" />
              Chờ duyệt
            </Badge>
          </div>
        )}
        {group.project_mode === 'custom' && !isPending && (
          <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5 gap-0.5">
            <Palette className="w-2.5 h-2.5" />
            Custom
          </Badge>
        )}
        {group.is_public && !isPending && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5">
            <Globe className="w-2.5 h-2.5 mr-0.5" />
            Public
          </Badge>
        )}
        {/* Star toggle — top-right, visible on hover or if starred */}
        {onToggleStar && !isPending && (
          <button
            onClick={handleToggleStar}
            className={`absolute top-2 right-2 transition-all duration-150 ease-in-out rounded-full p-1 ${
              isStarred
                ? 'opacity-100 text-yellow-500'
                : 'opacity-0 group-hover:opacity-80 text-muted-foreground hover:text-yellow-500'
            } ${group.is_public ? 'top-8' : ''}`}
            title={isStarred ? 'Unstar' : 'Star'}
          >
            <Star className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="font-medium text-sm leading-tight line-clamp-1 text-foreground">{group.name}</h3>
        {group.description && <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
          {isPending && (
            <span className="flex items-center gap-0.5 bg-warning/10 text-warning px-1.5 py-0.5 rounded font-medium">
              <Clock className="w-2.5 h-2.5" />
              Đang chờ duyệt
            </span>
          )}
          {group.class_code && !isPending && (
            <span className="flex items-center gap-0.5 bg-muted/70 px-1.5 py-0.5 rounded">
              <Users className="w-2.5 h-2.5" />
              {group.class_code}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {formatDate(group.created_at)}
          </span>
        </div>
      </div>
    </Wrapper>
  );
}

export default React.memo(DashboardProjectCardInner);
