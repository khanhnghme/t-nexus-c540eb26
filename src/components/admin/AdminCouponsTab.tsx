import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Tag, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { CouponFormDialog } from './CouponFormDialog';
import { toast } from 'sonner';

const PLAN_LABELS: Record<string, string> = {
  plan_free: 'Free', plan_plus: 'Plus', plan_pro: 'Pro', plan_business: 'Business', plan_custom: 'Custom',
};

export function AdminCouponsTab() {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.coupons;
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: () => toast.error('Failed to update coupon'),
  });

  const isExpired = (c: any) => c.expires_at && new Date(c.expires_at) < new Date();
  const isMaxed = (c: any) => c.max_uses !== null && c.used_count >= c.max_uses;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t?.subtitle || 'Manage discount codes and promotions'}</p>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t?.create || 'Create Coupon'}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t?.empty || 'No coupons created yet'}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t?.code || 'Code'}</TableHead>
              <TableHead>{t?.discount || 'Discount'}</TableHead>
              <TableHead>{t?.usage || 'Usage'}</TableHead>
              <TableHead>{t?.applicablePlans || 'Plans'}</TableHead>
              <TableHead>{t?.validity || 'Validity'}</TableHead>
              <TableHead>{t?.statusLabel || 'Status'}</TableHead>
              <TableHead>{t?.active || 'Active'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c: any) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => { setEditing(c); setFormOpen(true); }}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono font-medium text-sm">{c.code}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {c.discount_type === 'percentage' ? <Percent className="h-3.5 w-3.5 text-blue-500" /> : <DollarSign className="h-3.5 w-3.5 text-emerald-500" />}
                    <span className="text-sm font-medium">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${Number(c.discount_value).toFixed(2)}`}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {c.used_count}/{c.max_uses ?? '∞'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(!c.applicable_plans || c.applicable_plans.length === 0) ? (
                      <span className="text-xs text-muted-foreground">{t?.allPlans || 'All plans'}</span>
                    ) : (
                      c.applicable_plans.map((p: string) => (
                        <Badge key={p} variant="secondary" className="text-xs">{PLAN_LABELS[p] || p}</Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.starts_at && <div>{format(new Date(c.starts_at), 'dd/MM/yyyy')}</div>}
                  {c.expires_at && <div>→ {format(new Date(c.expires_at), 'dd/MM/yyyy')}</div>}
                  {!c.starts_at && !c.expires_at && '—'}
                </TableCell>
                <TableCell>
                  {isExpired(c) ? (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive">{t?.expired || 'Expired'}</Badge>
                  ) : isMaxed(c) ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{t?.maxedOut || 'Maxed'}</Badge>
                  ) : c.is_active ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{t?.activeStatus || 'Active'}</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">{t?.inactive || 'Inactive'}</Badge>
                  )}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Switch checked={c.is_active} onCheckedChange={v => toggleMutation.mutate({ id: c.id, is_active: v })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CouponFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} coupon={editing} />
    </div>
  );
}
