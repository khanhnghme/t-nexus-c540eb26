import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (orderId) {
      navigate(`/checkout/${orderId}/summary`, { replace: true });
    } else {
      navigate('/billing-history', { replace: true });
    }
  }, [orderId, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
