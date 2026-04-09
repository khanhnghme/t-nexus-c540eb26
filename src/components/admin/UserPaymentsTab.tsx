import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Receipt, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentDetailDialog } from './PaymentDetailDialog';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  failed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  refunded: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  chargeback: 'bg-destructive/10 text-destructive',
};

interface UserPaymentsTabProps {
  userId: string;
}

export function UserPaymentsTab({ userId }: UserPaymentsTabProps) {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.payments;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-payments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = payments.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.transaction_id?.toLowerCase().includes(q) || p.order_id?.toLowerCase().includes(q) || p.invoice_id?.toLowerCase().includes(q));
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Transaction ID', 'Order ID', 'Plan', 'Amount', 'Currency', 'Method', 'Status', 'Paid At'];
    const rows = filtered.map(p => [
      p.transaction_id || '', p.order_id || '', p.plan_purchased,
      p.final_amount ?? p.amount, p.currency, p.payment_method || '', p.status,
      p.paid_at ? format(new Date(p.paid_at), 'yyyy-MM-dd HH:mm') : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${userId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const PLAN_LABELS: Record<string, string> = {
    plan_free: 'Free', plan_plus: 'Plus', plan_pro: 'Pro', plan_business: 'Business', plan_custom: 'Custom',
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t?.searchPlaceholder || 'Search by transaction/order ID...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t?.allStatuses || 'All Statuses'}</SelectItem>
            <SelectItem value="paid">{t?.status?.paid || 'Paid'}</SelectItem>
            <SelectItem value="pending">{t?.status?.pending || 'Pending'}</SelectItem>
            <SelectItem value="failed">{t?.status?.failed || 'Failed'}</SelectItem>
            <SelectItem value="refunded">{t?.status?.refunded || 'Refunded'}</SelectItem>
            <SelectItem value="cancelled">{t?.status?.cancelled || 'Cancelled'}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1.5" />
          {t?.exportCSV || 'Export CSV'}
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Receipt className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">{t?.empty || 'No payment records found'}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t?.columns?.transactionId || 'Transaction ID'}</TableHead>
                <TableHead>{t?.columns?.plan || 'Plan'}</TableHead>
                <TableHead>{t?.columns?.amount || 'Amount'}</TableHead>
                <TableHead>{t?.columns?.method || 'Method'}</TableHead>
                <TableHead>{t?.columns?.status || 'Status'}</TableHead>
                <TableHead>{t?.columns?.paidAt || 'Paid At'}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedPayment(p)}>
                  <TableCell className="font-mono text-xs">{p.transaction_id?.slice(0, 12) || '—'}...</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{PLAN_LABELS[p.plan_purchased] || p.plan_purchased}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {(p.final_amount ?? p.amount).toLocaleString()} {p.currency}
                  </TableCell>
                  <TableCell className="text-sm">{p.payment_method || '—'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[p.status] || ''} variant="secondary">
                      {t?.status?.[p.status] || p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy HH:mm') : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <PaymentDetailDialog
        payment={selectedPayment}
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </div>
  );
}
