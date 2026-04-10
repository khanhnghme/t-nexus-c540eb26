import { forwardRef } from 'react';
import { format } from 'date-fns';
import { Profile } from '@/types/database';

const PLAN_LABELS: Record<string, string> = {
  plan_free: 'Free', plan_plus: 'Plus', plan_pro: 'Pro', plan_business: 'Business', plan_custom: 'Custom',
};

interface InvoiceTemplateProps {
  payment: any;
  profile: Profile;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ payment, profile }, ref) => {
    const displayAmount = payment.final_amount ?? payment.amount;
    const originalAmount = payment.original_amount ?? payment.amount;
    const hasDiscount = (payment.discount_amount ?? 0) > 0 || (payment.coupon_code);

    return (
      <div ref={ref} className="bg-white text-black p-10 max-w-[800px] mx-auto print:p-6" id="invoice-print">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #invoice-print, #invoice-print * { visibility: visible; }
            #invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>

        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
            <p className="text-sm text-gray-500 mt-1">Payment Receipt</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-semibold text-gray-900">TaskFlow</p>
            <p>Digital Service</p>
          </div>
        </div>

        {/* Invoice Info + Buyer */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Invoice Details</h3>
            <div className="space-y-1 text-sm">
              {payment.invoice_id && <p><span className="text-gray-500">Invoice #:</span> {payment.invoice_id}</p>}
              {payment.transaction_id && <p><span className="text-gray-500">Transaction:</span> {payment.transaction_id}</p>}
              {payment.order_id && <p><span className="text-gray-500">Order:</span> {payment.order_id}</p>}
              <p><span className="text-gray-500">Date:</span> {payment.paid_at ? format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm') : format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}</p>
              <p><span className="text-gray-500">Status:</span> {payment.status === 'completed' || payment.status === 'paid' ? 'Paid' : payment.status}</p>
              {payment.payment_method && <p><span className="text-gray-500">Method:</span> {payment.payment_method}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Bill To</h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{profile.full_name}</p>
              <p className="text-gray-600">{profile.email}</p>
              {profile.institution && <p className="text-gray-600">{profile.institution}</p>}
            </div>
          </div>
        </div>

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

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          <p>Thank you for your purchase! This is a computer-generated invoice.</p>
          <p className="mt-1">Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
