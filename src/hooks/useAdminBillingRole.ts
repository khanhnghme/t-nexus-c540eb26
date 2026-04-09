import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BillingRole = 'billing_viewer' | 'billing_operator' | 'billing_manager';

export function useAdminBillingRole() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-billing-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, billing_role')
        .eq('user_id', user.id);

      if (!roles || roles.length === 0) return null;

      const isOwner = roles.some(r => r.role === 'system_owner');
      if (isOwner) return 'billing_manager' as BillingRole;

      const isAdmin = roles.some(r => r.role === 'system_admin' || r.role === 'system_owner');
      if (isAdmin) {
        const billingRole = roles[0]?.billing_role as BillingRole | null;
        return billingRole || 'billing_viewer' as BillingRole;
      }

      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const billingRole = data ?? null;

  return {
    billingRole,
    isLoading,
    canView: billingRole !== null,
    canOperate: billingRole === 'billing_operator' || billingRole === 'billing_manager',
    canManage: billingRole === 'billing_manager',
  };
}
