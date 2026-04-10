import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (!orderId) {
      navigate('/billing-history', { replace: true });
      return;
    }

    // Resolve order_code from order id
    supabase
      .from('orders')
      .select('order_code')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (data?.order_code) {
          navigate(`/checkout/summary/${data.order_code}`, { replace: true });
        } else {
          navigate('/billing-history', { replace: true });
        }
      });
  }, [orderId, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
