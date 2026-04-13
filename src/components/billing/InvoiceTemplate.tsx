import { forwardRef } from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Profile } from '@/types/database';
import tNexusText from '@/assets/t-nexus-text.png';

const PLAN_LABELS: Record<string, string> = {
  plan_free: 'Free', plan_plus: 'Plus', plan_pro: 'Pro', plan_business: 'Business', plan_custom: 'Custom',
};

interface InvoiceTemplateProps {
  payment: any;
  profile: Profile;
  orderCode?: string;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ payment, profile, orderCode }, ref) => {
    const displayAmount = payment.final_amount ?? payment.amount;
    const originalAmount = payment.original_amount ?? payment.amount;
    const hasDiscount = (payment.discount_amount ?? 0) > 0 || (payment.coupon_code);
    const invoiceNumber = payment.invoice_id || (payment.order_id ? `INV-${payment.order_id.slice(0, 12).toUpperCase()}` : `INV-${payment.id?.slice(0, 8)?.toUpperCase()}`);
    const paidDate = payment.paid_at || payment.created_at;
    const isCompleted = payment.status === 'completed' || payment.status === 'paid';
    const invoiceUrl = orderCode ? `https://t-nexus.io.vn/checkout/summary/${orderCode}` : null;

    return (
      <div ref={ref} className="bg-white text-black p-10 max-w-[800px] mx-auto print:p-6" id="invoice-print">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #invoice-print, #invoice-print * { visibility: visible; }
            #invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>

        {/* Header with Logo */}
        <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-6">
          <div>
            <img src={tNexusText} alt="T-Nexus" style={{ width: 140, height: 'auto' }} className="mb-2" />
            <p className="text-xs text-gray-500">Digital Project Management Service</p>
            <p className="text-xs text-gray-400 mt-1">https://t-nexus.io.vn</p>
            <p className="text-xs text-gray-400">Email: support@t-nexus.io.vn</p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
            <p className="text-sm text-gray-500 mt-1">Payment Receipt</p>
            <p className="text-sm font-mono font-semibold text-gray-700 mt-2">{invoiceNumber}</p>
          </div>
        </div>

        {/* Invoice Info + Buyer */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Invoice Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">Invoice #:</span> {invoiceNumber}</p>
              {payment.transaction_id && <p><span className="text-gray-500">Transaction:</span> {payment.transaction_id}</p>}
              {payment.order_id && <p><span className="text-gray-500">Order:</span> {payment.order_id}</p>}
              <p><span className="text-gray-500">Date:</span> {paidDate ? format(new Date(paidDate), 'dd/MM/yyyy HH:mm') : format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}</p>
              <p>
                <span className="text-gray-500">Status:</span>{' '}
                <span className={`font-semibold ${isCompleted ? 'text-green-700' : 'text-red-600'}`}>
                  {isCompleted ? '✓ Paid' : payment.status}
                </span>
              </p>
              {payment.payment_method && <p><span className="text-gray-500">Method:</span> {payment.payment_method}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Bill To</h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{profile.full_name}</p>
              <p className="text-gray-600">{profile.email}</p>
              {profile.student_id && <p className="text-gray-600">Student ID: {profile.student_id}</p>}
              {profile.institution && <p className="text-gray-600">{profile.institution}</p>}
            </div>
          </div>
        </div>

        {/* Billing Period */}
        {isCompleted && (profile.plan_started_at || profile.plan_expires_at) && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Billing Period</h3>
            <div className="flex gap-6 text-sm">
              {profile.plan_started_at && (
                <p><span className="text-gray-500">Active from:</span> <span className="font-medium">{format(new Date(profile.plan_started_at), 'dd/MM/yyyy')}</span></p>
              )}
              {profile.plan_expires_at && (
                <p><span className="text-gray-500">Expires:</span> <span className="font-medium">{format(new Date(profile.plan_expires_at), 'dd/MM/yyyy')}</span></p>
              )}
            </div>
          </div>
        )}

        {/* Line Items */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 font-semibold text-gray-700">Description</th>
              <th className="text-right py-3 font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">
                <p className="font-medium">{PLAN_LABELS[payment.plan_purchased] || payment.plan_purchased} Plan</p>
                {payment.description && <p className="text-xs text-gray-500 mt-0.5">{payment.description}</p>}
              </td>
              <td className="py-3 text-right tabular-nums">{originalAmount?.toLocaleString()} {payment.currency}</td>
            </tr>
            {hasDiscount && (
              <tr className="border-b border-gray-100 text-green-700">
                <td className="py-3">
                  Discount {payment.coupon_code && <span className="text-xs">({payment.coupon_code})</span>}
                </td>
                <td className="py-3 text-right tabular-nums">-{(payment.discount_amount ?? 0)?.toLocaleString()} {payment.currency}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td className="py-4 font-bold text-base">Total</td>
              <td className="py-4 text-right font-bold text-base tabular-nums">{displayAmount?.toLocaleString()} {payment.currency}</td>
            </tr>
          </tfoot>
        </table>

        {/* Payment Notes */}
        <div className="mb-6 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-600 text-sm mb-1">Notes</p>
          <p>• Payment processed via international PayPal gateway.</p>
          <p>• Service plan activates automatically upon successful payment.</p>
          <p>• For inquiries, please contact support@t-nexus.io.vn.</p>
        </div>

        {/* Electronic Signature & Stamp */}
        <div className="flex justify-between items-end mt-8 pt-6 border-t border-gray-200">
          {isCompleted && (
            <div>
              <p
                className="font-bold text-green-600 text-xl uppercase px-4 py-2 inline-block"
                style={{
                  border: '3px solid #16a34a',
                  borderRadius: 8,
                  transform: 'rotate(-12deg)',
                  opacity: 0.8,
                }}
              >
                PAID
              </p>
            </div>
          )}

          <div className="text-center" style={{ width: 200 }}>
            <p className="text-xs text-gray-400 mb-14">Electronic Signature</p>
            <div className="border-b border-gray-400 w-full mb-2" />
            <p className="font-bold text-gray-800 text-sm">T-Nexus System</p>
            <p className="text-[10px] text-gray-400">
              {paidDate ? format(new Date(paidDate), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 mt-6 text-center space-y-1">
          {invoiceUrl && (
            <div className="flex justify-center mb-3">
              <div className="flex flex-col items-center">
                <QRCodeSVG value={invoiceUrl} size={80} level="M" />
                <p className="text-[9px] text-gray-400 mt-1">Scan to view invoice</p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">This is a computer-generated electronic invoice by T-Nexus.</p>
          <p className="text-xs text-gray-400">Support: support@t-nexus.io.vn | https://t-nexus.io.vn</p>
          <p className="text-[10px] text-gray-300 mt-2">Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
