import { useAccountReadOnly } from '@/hooks/useAccountReadOnly';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

/**
 * Hook that provides a guard function to check read-only status before mutations.
 * Usage:
 *   const { guardAction } = useReadOnlyGuard();
 *   const handleCreate = () => {
 *     if (guardAction()) return; // blocked
 *     // proceed with creation
 *   };
 */
export function useReadOnlyGuard() {
  const { isReadOnly, isLoading } = useAccountReadOnly();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const isVi = locale === 'vi';

  const guardAction = useCallback((): boolean => {
    if (isReadOnly) {
      toast({
        title: isVi ? 'Tài khoản chỉ đọc' : 'Read-only account',
        description: isVi
          ? 'Dữ liệu vượt hạn mức gói Free. Vui lòng nâng cấp hoặc xóa bớt dữ liệu để tiếp tục.'
          : 'Data exceeds Free plan limits. Please upgrade or delete data to continue.',
        variant: 'destructive',
      });
      return true; // blocked
    }
    return false; // allowed
  }, [isReadOnly, isVi, toast]);

  return { isReadOnly, isLoading, guardAction };
}
