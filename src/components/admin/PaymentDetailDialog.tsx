import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { CreditCard, FileText, Tag, MessageSquare } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  failed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  refunded: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  chargeback: 'bg-destructive/10 text-destructive',
};

const PLAN_LABELS: Record<string, string> = {
  plan_free: 'Free', plan_plus: 'Plus', plan_pro: 'Pro', plan_business: 'Business', plan_custom: 'Custom',
};

interface PaymentDetailDialogProps {
  payment: any;
  open: boolean;
  onClose: () => void;
}

export function PaymentDetailDialog({ payment, open, onClose }: PaymentDetailDialogProps) {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.payments;

  if (!payment) return null;

  const InfoRow = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[60%] break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t?.detail?.title || 'Payment Details'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-0">
            <InfoRow label={t?.columns?.transactionId || 'Transaction ID'} value={payment.transaction_id} mono />
            <InfoRow label={t?.detail?.orderId || 'Order ID'} value={payment.order_id} mono />
            <InfoRow label={t?.detail?.invoiceId || 'Invoice ID'} value={payment.invoice_id} mono />
            <InfoRow label={t?.columns?.plan || 'Plan'} value={
              <Badge variant="secondary">{PLAN_LABELS[payment.plan_purchased] || payment.plan_purchased}</Badge>
            } />
            <InfoRow label={t?.columns?.status || 'Status'} value={
              <Badge className={STATUS_COLORS[payment.status] || ''} variant="secondary">
                {t?.status?.[payment.status] || payment.status}
              </Badge>
            } />
            <InfoRow label={t?.columns?.method || 'Method'} value={payment.payment_method} />
          </div>

          {/* Amounts */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-0">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t?.detail?.amounts || 'Amounts'}</span>
            </div>
            <InfoRow label={t?.detail?.originalAmount || 'Original'} value={`${(payment.original_amount ?? payment.amount)?.toLocaleString()} ${payment.currency}`} />
            {payment.discount_amount > 0 && (
              <InfoRow label={t?.detail?.discount || 'Discount'} value={`-${payment.discount_amount?.toLocaleString()} ${payment.currency}`} />
            )}
            <InfoRow label={t?.detail?.finalAmount || 'Final Amount'} value={
              <span className="text-base font-bold text-foreground">{(payment.final_amount ?? payment.amount)?.toLocaleString()} {payment.currency}</span>
            } />
            <InfoRow label={t?.columns?.paidAt || 'Paid At'} value={payment.paid_at ? format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm:ss') : '—'} />
          </div>

          {/* Extra Info */}
          {(payment.coupon_code || payment.description || payment.system_note) && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-0">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t?.detail?.additional || 'Additional Info'}</span>
              </div>
              {payment.coupon_code && (
                <InfoRow label={t?.detail?.coupon || 'Coupon'} value={
                  <Badge variant="outline" className="gap-1"><Tag className="h-3 w-3" />{payment.coupon_code}</Badge>
                } />
              )}
              {payment.description && <InfoRow label={t?.detail?.description || 'Description'} value={payment.description} />}
              {payment.system_note && (
                <InfoRow label={t?.detail?.systemNote || 'System Note'} value={
                  <span className="text-xs italic text-muted-foreground">{payment.system_note}</span>
                } />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
