import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { CreditCard, FileText, Tag, MessageSquare, Printer } from 'lucide-react';
import { InvoiceTemplate } from './InvoiceTemplate';

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  failed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  refunded: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

const PLAN_LABELS: Record<string, string> = {
  plan_free: 'Free', plan_plus: 'Plus', plan_pro: 'Pro', plan_business: 'Business', plan_custom: 'Custom',
};

interface UserPaymentDetailDialogProps {
  payment: any;
  open: boolean;
  onClose: () => void;
}

export function UserPaymentDetailDialog({ payment, open, onClose }: UserPaymentDetailDialogProps) {
  const { translations } = useLanguage();
  const { profile } = useAuth();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const t = translations.app?.adminBilling?.payments;

  if (!payment || !profile) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow || !invoiceRef.current) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Invoice - ${payment.transaction_id || payment.id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; }
        .invoice { padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 1px solid #e5e5e5; padding-bottom: 24px; }
        .header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
        .header .subtitle { font-size: 13px; color: #888; margin-top: 4px; }
        .header .company { text-align: right; font-size: 13px; color: #666; }
        .header .company .name { font-weight: 600; color: #111; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
        .info-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 8px; font-weight: 600; }
        .info-section p { font-size: 13px; margin: 4px 0; }
        .info-section .label { color: #888; }
        .info-section .name { font-weight: 500; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        thead tr { border-bottom: 2px solid #ddd; }
        th { text-align: left; padding: 10px 0; font-weight: 600; color: #555; }
        th:last-child { text-align: right; }
        td { padding: 10px 0; }
        td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
        tbody tr { border-bottom: 1px solid #f0f0f0; }
        .discount { color: #16a34a; }
        tfoot tr { border-top: 2px solid #ccc; }
        tfoot td { padding-top: 16px; font-weight: 700; font-size: 15px; }
        .footer { border-top: 1px solid #e5e5e5; padding-top: 16px; text-align: center; font-size: 11px; color: #aaa; }
        .desc-sub { font-size: 11px; color: #888; margin-top: 2px; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style></head><body>
      <div class="invoice">
        ${invoiceRef.current.innerHTML.replace(/class="[^"]*"/g, (match) => match)}
      </div></body></html>
    `);
    
    // Use a simpler approach - rebuild HTML
    const p = payment;
    const originalAmount = p.original_amount ?? p.amount;
    const finalAmount = p.final_amount ?? p.amount;
    const hasDiscount = (p.discount_amount ?? 0) > 0 || p.coupon_code;
    const dateStr = p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-GB') + ' ' + new Date(p.paid_at).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : new Date(p.created_at).toLocaleDateString('en-GB');
    const statusLabel = p.status === 'completed' || p.status === 'paid' ? 'Paid' : p.status;

    printWindow.document.body.innerHTML = `
      <div class="invoice">
        <div class="header">
          <div><h1>INVOICE</h1><p class="subtitle">Payment Receipt</p></div>
          <div class="company"><p class="name">TaskFlow</p><p>Digital Service</p></div>
        </div>
        <div class="info-grid">
          <div class="info-section">
            <h3>Invoice Details</h3>
            ${p.invoice_id ? `<p><span class="label">Invoice #:</span> ${p.invoice_id}</p>` : ''}
            ${p.transaction_id ? `<p><span class="label">Transaction:</span> ${p.transaction_id}</p>` : ''}
            ${p.order_id ? `<p><span class="label">Order:</span> ${p.order_id}</p>` : ''}
            <p><span class="label">Date:</span> ${dateStr}</p>
            <p><span class="label">Status:</span> ${statusLabel}</p>
            ${p.payment_method ? `<p><span class="label">Method:</span> ${p.payment_method}</p>` : ''}
          </div>
          <div class="info-section">
            <h3>Bill To</h3>
            <p class="name">${profile.full_name}</p>
            <p>${profile.email}</p>
            ${profile.institution ? `<p>${profile.institution}</p>` : ''}
          </div>
        </div>
        <table>
          <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>${PLAN_LABELS[p.plan_purchased] || p.plan_purchased} Plan</strong>${p.description ? `<div class="desc-sub">${p.description}</div>` : ''}</td>
              <td>${originalAmount?.toLocaleString()} ${p.currency}</td>
            </tr>
            ${hasDiscount ? `<tr class="discount"><td>Discount${p.coupon_code ? ` (${p.coupon_code})` : ''}</td><td>-${(p.discount_amount ?? 0)?.toLocaleString()} ${p.currency}</td></tr>` : ''}
          </tbody>
          <tfoot><tr><td>Total</td><td>${finalAmount?.toLocaleString()} ${p.currency}</td></tr></tfoot>
        </table>
        <div class="footer">
          <p>Thank you for your purchase! This is a computer-generated invoice.</p>
          <p style="margin-top:4px">Generated on ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}</p>
        </div>
      </div>
    `;

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

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
                {payment.status === 'completed' ? 'Paid' : payment.status}
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
            {(payment.discount_amount ?? 0) > 0 && (
              <InfoRow label={t?.detail?.discount || 'Discount'} value={`-${payment.discount_amount?.toLocaleString()} ${payment.currency}`} />
            )}
            <InfoRow label={t?.detail?.finalAmount || 'Final Amount'} value={
              <span className="text-base font-bold text-foreground">{(payment.final_amount ?? payment.amount)?.toLocaleString()} {payment.currency}</span>
            } />
            <InfoRow label={t?.columns?.paidAt || 'Paid At'} value={payment.paid_at ? format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm:ss') : '—'} />
          </div>

          {/* Coupon / Description */}
          {(payment.coupon_code || payment.description) && (
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
            </div>
          )}

          {/* Print Button */}
          <Button onClick={handlePrint} variant="outline" className="w-full gap-2">
            <Printer className="h-4 w-4" />
            {t?.detail?.printInvoice || 'Print Invoice'}
          </Button>
        </div>

        {/* Hidden invoice for reference */}
        <div className="hidden">
          <InvoiceTemplate ref={invoiceRef} payment={payment} profile={profile} orderCode={payment.order_id ? undefined : undefined} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
