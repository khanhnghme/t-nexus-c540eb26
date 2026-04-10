import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPlanName } from '@/hooks/useWorkspaceBilling';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Receipt, CreditCard } from 'lucide-react';


type BillingRecord = {
  id: string;
  source: 'payment' | 'order';
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  status: string;
  plan_purchased: string;
  total_amount: number;
  final_amount: number | null;
  amount: number;
  transaction_id: string | null;
  order_id: string | null;
  payment_method: string | null;
  coupon_code: string | null;
  expires_at: string | null;
  raw: any;
};

const STATUS_CONFIG: Record<string, { label: string; labelVi: string; className: string }> = {
  completed: { label: 'Paid', labelVi: 'Đã thanh toán', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none' },
  pending: { label: 'Pending', labelVi: 'Đang chờ', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none' },
  expired: { label: 'Expired', labelVi: 'Hết hạn', className: 'bg-muted text-muted-foreground border-none' },
  cancelled: { label: 'Cancelled', labelVi: 'Đã hủy', className: 'bg-destructive/15 text-destructive border-none' },
  failed: { label: 'Failed', labelVi: 'Thất bại', className: 'bg-destructive/15 text-destructive border-none' },
};

export default function BillingHistory() {
  const { user, profile } = useAuth();
  const { translations: { app: { servicePlan: t } } } = useLanguage();
  const navigate = useNavigate();
  const isVi = (profile as any)?.preferred_locale === 'vi' || document.documentElement.lang === 'vi';

  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [payRes, orderRes] = await Promise.all([
      supabase.from('payment_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);

    const paymentRecords: BillingRecord[] = (payRes.data || []).map((r: any) => ({
      id: r.id,
      source: 'payment' as const,
      created_at: r.created_at,
      paid_at: r.paid_at,
      completed_at: r.paid_at,
      status: r.status || 'completed',
      plan_purchased: r.plan_purchased,
      total_amount: r.final_amount ?? r.amount,
      final_amount: r.final_amount,
      amount: r.amount,
      transaction_id: r.transaction_id,
      order_id: r.order_id,
      payment_method: r.payment_method,
      coupon_code: r.coupon_code,
      expires_at: null,
      raw: r,
    }));

    const completedOrderIds = new Set(paymentRecords.map(p => p.order_id).filter(Boolean));
    const pendingOrders: BillingRecord[] = (orderRes.data || [])
      .filter((o: any) => !completedOrderIds.has(o.id) && o.status !== 'completed')
      .map((o: any) => ({
        id: o.id,
        source: 'order' as const,
        created_at: o.created_at,
        paid_at: o.completed_at,
        completed_at: o.completed_at,
        status: o.status || 'pending',
        plan_purchased: o.plan || o.order_type || '—',
        total_amount: o.total_amount,
        final_amount: o.total_amount,
        amount: o.total_amount,
        transaction_id: null,
        order_id: o.id,
        payment_method: o.payment_method,
        coupon_code: o.coupon_code,
        expires_at: o.expires_at,
        raw: o,
      }));

    const all = [...paymentRecords, ...pendingOrders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setRecords(all);
    setLoading(false);
  };

  const filtered = filter === 'all' ? records : records.filter(r => {
    if (filter === 'paid') return r.status === 'completed';
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'expired') return r.status === 'expired' || r.status === 'cancelled';
    return true;
  });

  const canContinuePayment = (r: BillingRecord) =>
    r.status === 'pending' && r.expires_at && new Date(r.expires_at).getTime() > Date.now();

  const formatDateTimeParts = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    const datePart = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    const timePart = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    return { datePart, timePart };
  };

  const DateTimeCell = ({ value }: { value: string | null }) => {
    const parts = formatDateTimeParts(value);
    if (!parts) return <span>—</span>;
    return (
      <div className="leading-tight">
        <div>{parts.datePart}</div>
        <div className="text-muted-foreground text-[11px]">{parts.timePart}</div>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.failed;
    return (
      <Badge variant="secondary" className={`text-[10px] whitespace-nowrap ${cfg.className}`}>
        {isVi ? cfg.labelVi : cfg.label}
      </Badge>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-2">
          <Receipt className="w-6 h-6 text-muted-foreground" />
          {isVi ? 'Lịch sử thanh toán' : 'Billing History'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isVi ? 'Theo dõi tất cả giao dịch và đơn hàng của bạn' : 'Track all your transactions and orders'}
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">{isVi ? 'Tất cả' : 'All'}</TabsTrigger>
          <TabsTrigger value="paid">{isVi ? 'Hoàn tất' : 'Paid'}</TabsTrigger>
          <TabsTrigger value="pending">{isVi ? 'Đang chờ' : 'Pending'}</TabsTrigger>
          <TabsTrigger value="expired">{isVi ? 'Hết hạn / Hủy' : 'Expired / Cancelled'}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{isVi ? 'Ngày đặt' : 'Created'}</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{isVi ? 'Mã đơn' : 'Order ID'}</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{isVi ? 'Gói' : 'Plan'}</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{isVi ? 'Phương thức' : 'Method'}</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{isVi ? 'Thanh toán lúc' : 'Paid at'}</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{isVi ? 'Số tiền' : 'Amount'}</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{isVi ? 'Trạng thái' : 'Status'}</th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">{isVi ? 'Chưa có giao dịch' : 'No transactions yet'}</td></tr>
              ) : filtered.map(row => {
                const displayAmount = row.final_amount ?? row.amount;
                return (
                  <tr
                    key={`${row.source}-${row.id}`}
                    className={`hover:bg-muted/50 transition-colors ${['completed', 'failed', 'cancelled', 'expired'].includes(row.status) ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      const finalStatuses = ['completed', 'failed', 'cancelled', 'expired'];
                      if (finalStatuses.includes(row.status)) {
                        const code = row.raw?.order_code;
                        if (code) navigate(`/checkout/summary/${code}`);
                      }
                    }}
                  >
                    <td className="px-5 py-3 text-sm"><DateTimeCell value={row.created_at} /></td>
                    <td className="px-5 py-3 text-sm font-mono text-xs text-muted-foreground">
                      {row.raw?.order_code || `#${(row.order_id || row.id).slice(0, 8).toUpperCase()}`}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">{formatPlanName(row.plan_purchased)}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{row.payment_method || '—'}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground"><DateTimeCell value={row.paid_at} /></td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums">${displayAmount.toFixed(2)}</td>
                    <td className="px-5 py-3 text-center">{getStatusBadge(row.status)}</td>
                    <td className="px-5 py-3 text-center">
                      {canContinuePayment(row) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            const code = row.raw?.order_code;
                            if (!code) return;
                            sessionStorage.setItem('checkout_payment_return_path', window.location.pathname + window.location.search);
                            if (row.raw?.order_type === 'addon') {
                              navigate(`/addon-checkout/${code}`);
                            } else {
                              navigate(`/checkout/payment/${code}`);
                            }
                          }}
                        >
                          <CreditCard className="w-3 h-3" />
                          {isVi ? 'Thanh toán' : 'Pay'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
