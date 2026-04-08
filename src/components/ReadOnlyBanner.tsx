import { useAccountReadOnly } from '@/hooks/useAccountReadOnly';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ReadOnlyBanner() {
  const { isReadOnly, isLoading, graceDaysRemaining } = useAccountReadOnly();
  const { locale } = useLanguage();

  if (isLoading || !isReadOnly) return null;

  const isVi = locale === 'vi';

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-destructive">
            {isVi ? 'Tài khoản đang ở chế độ Chỉ đọc' : 'Account is in Read-only mode'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isVi
              ? 'Dữ liệu của bạn vượt hạn mức gói Free. Bạn chỉ có thể xem hoặc xóa bớt dữ liệu.'
              : 'Your data exceeds Free plan limits. You can only view or delete data.'}
            {graceDaysRemaining !== null && graceDaysRemaining > 0 && (
              <span className="font-medium text-destructive ml-1">
                {isVi
                  ? `Còn ${graceDaysRemaining} ngày trước khi dữ liệu bị xóa tự động.`
                  : `${graceDaysRemaining} days remaining before automatic deletion.`}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" className="text-xs gap-1" asChild>
          <Link to="/service-plan?tab=usage">
            <Trash2 className="w-3 h-3" />
            {isVi ? 'Dọn dẹp' : 'Clean up'}
          </Link>
        </Button>
        <Button size="sm" className="text-xs gap-1 bg-primary" asChild>
          <Link to="/upgrade">
            <Zap className="w-3 h-3" />
            {isVi ? 'Nâng cấp' : 'Upgrade'}
          </Link>
        </Button>
      </div>
    </div>
  );
}
