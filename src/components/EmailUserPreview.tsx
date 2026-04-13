import { Loader2, UserCheck, UserX } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';

interface EmailUserPreviewProps {
  previewUser: { id: string; full_name: string; avatar_url: string | null; email: string } | null;
  isLooking: boolean;
  notFound: boolean;
  notFoundText?: string;
}

export default function EmailUserPreview({ previewUser, isLooking, notFound, notFoundText }: EmailUserPreviewProps) {
  if (isLooking) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Đang tra cứu...</span>
      </div>
    );
  }

  if (previewUser) {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-primary/30 bg-primary/5">
        <UserAvatar
          src={previewUser.avatar_url}
          name={previewUser.full_name}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{previewUser.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{previewUser.email}</p>
        </div>
        <UserCheck className="w-4 h-4 text-primary shrink-0" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed text-muted-foreground text-xs">
        <UserX className="w-4 h-4 shrink-0" />
        <span>{notFoundText || 'Người dùng chưa có tài khoản — lời mời sẽ được gửi qua email.'}</span>
      </div>
    );
  }

  return null;
}
