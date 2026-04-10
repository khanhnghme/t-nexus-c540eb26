import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight, RotateCcw, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OrderData {
  id: string;
  plan: string;
  billing_cycle: string;
  total_amount: number;
  base_amount: number;
  addon_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  status: string;
  completed_at: string | null;
}

import { getPlanLabel } from '@/lib/planConfig';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { translations: { paymentResult: t } } = useLanguage();
  const { refreshProfile } = useAuth();

  const status = searchParams.get('status') || 'failed';
  const orderId = searchParams.get('order_id');
  const isSuccess = status === 'success';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOrder(data as OrderData);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4 space-y-6">
      {/* Status Icon + Title */}
      <div className="flex flex-col items-center text-center space-y-4">
        {isSuccess ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
              <div className="relative p-4 bg-emerald-500/10 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">{t?.successTitle || 'Payment Successful!'}</h1>
            <p className="text-muted-foreground">{t?.successDesc || 'Your plan has been upgraded successfully.'}</p>
          </>
        ) : (
          <>
            <div className="p-4 bg-destructive/10 rounded-full">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">{t?.failedTitle || 'Payment Failed'}</h1>
            <p className="text-muted-foreground">{t?.failedDesc || 'Something went wrong with your payment. Please try again.'}</p>
          </>
        )}
      </div>

      {/* Order Summary (success only) */}
      {isSuccess && order && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold">{t?.orderDetails || 'Order Details'}</h3>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t?.plan || 'Plan'}</span>
                <span className="font-medium">{getPlanLabel(order.plan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t?.cycle || 'Billing Cycle'}</span>
                <span className="font-medium capitalize">{order.billing_cycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t?.baseAmount || 'Base'}</span>
                <span>${order.base_amount.toFixed(2)}</span>
              </div>
              {order.addon_amount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t?.addons || 'Add-ons'}</span>
                  <span>+${order.addon_amount.toFixed(2)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{t?.discount || 'Discount'}{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                  <span>-${order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>{t?.total || 'Total'}</span>
                <span>${order.total_amount.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-center pt-1">
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none text-xs">
                {t?.completed || 'Completed'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {isSuccess ? (
          <>
            <Button onClick={() => navigate('/service-plan')} className="w-full">
              {t?.viewPlan || 'View Your Plan'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
              {t?.backDashboard || 'Back to Dashboard'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => navigate(-1)} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              {t?.tryAgain || 'Try Again'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/feedback')} className="w-full">
              <MessageCircle className="w-4 h-4 mr-2" />
              {t?.contactSupport || 'Contact Support'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
