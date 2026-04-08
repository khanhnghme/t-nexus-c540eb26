import { useAccountReadOnly } from '@/hooks/useAccountReadOnly';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, ArrowRight, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ReadOnlyBanner() {
  const { isReadOnly, isLoading, graceDaysRemaining } = useAccountReadOnly();
  const { t } = useLanguage();

  if (isLoading || !isReadOnly) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-destructive">
            {t('readOnlyBanner.title')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('readOnlyBanner.description')}
            {graceDaysRemaining !== null && graceDaysRemaining > 0 && (
              <span className="font-medium text-destructive ml-1">
                {t('readOnlyBanner.gracePeriod').replace('{days}', String(graceDaysRemaining))}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" className="text-xs gap-1" asChild>
          <Link to="/service-plan?tab=usage">
            <Trash2 className="w-3 h-3" />
            {t('readOnlyBanner.cleanup')}
          </Link>
        </Button>
        <Button size="sm" className="text-xs gap-1 bg-primary" asChild>
          <Link to="/upgrade">
            <Zap className="w-3 h-3" />
            {t('readOnlyBanner.upgrade')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
