import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentDetailDialog } from './PaymentDetailDialog';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  failed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  refunded: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};
import { getPlanLabel } from '@/lib/planConfig';

export function AdminTransactionsTab() {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.transactions;
  const pt = translations.app?.adminBilling?.payments;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['admin-all-transactions'],
    queryFn: async () => {
      const { data } = await supabase.from('payment_history').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = {} } = useQuery({
    queryKey: ['admin-profiles-map'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email');
      if (!data) return {};
      const map: Record<string, any> = {};
      data.forEach((p: any) => { map[p.id] = p; });
      return map;
    },
  });

  const filtered = useMemo(() => {
    return transactions.filter((tx: any) => {
      const matchSearch = !search || tx.transaction_id?.toLowerCase().includes(search.toLowerCase()) || tx.order_id?.toLowerCase().includes(search.toLowerCase()) || (profiles as any)[tx.user_id]?.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [transactions, search, statusFilter, profiles]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t?.searchPlaceholder || 'Search by transaction ID, user...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pt?.allStatuses || 'All Statuses'}</SelectItem>
            {['paid', 'pending', 'failed', 'cancelled', 'refunded'].map(s => <SelectItem key={s} value={s}>{pt?.status?.[s] || s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t?.empty || 'No transactions found'}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t?.user || 'User'}</TableHead>
              <TableHead>{t?.transactionId || 'Transaction ID'}</TableHead>
              <TableHead>{t?.plan || 'Plan'}</TableHead>
              <TableHead>{t?.amount || 'Amount'}</TableHead>
              <TableHead>{t?.status || 'Status'}</TableHead>
              <TableHead>{t?.date || 'Date'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tx: any) => {
              const profile = (profiles as any)[tx.user_id];
              return (
                <TableRow key={tx.id} className="cursor-pointer" onClick={() => setSelected(tx)}>
                  <TableCell className="text-sm">{profile?.full_name || '—'}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{tx.transaction_id || '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{getPlanLabel(tx.plan_purchased)}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">${Number(tx.final_amount || tx.amount || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[tx.status] || ''} variant="secondary">{pt?.status?.[tx.status] || tx.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tx.paid_at ? format(new Date(tx.paid_at), 'dd/MM/yyyy HH:mm') : format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <PaymentDetailDialog payment={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}
