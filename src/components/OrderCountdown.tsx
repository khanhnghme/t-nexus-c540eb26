import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OrderCountdownProps {
  expiresAt: string;
  orderId: string;
  orderCode?: string;
  onExpired?: () => void;
  onCreateNew?: () => void;
  isVi?: boolean;
}

export function OrderCountdown({ expiresAt, orderId, orderCode, onExpired, onCreateNew, isVi = false }: OrderCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, expired: false });

  const calculate = useCallback(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  }, [expiresAt]);

  useEffect(() => {
    setTimeLeft(calculate());
    const id = setInterval(() => {
      const t = calculate();
      setTimeLeft(t);
      if (t.expired) {
        clearInterval(id);
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [calculate, onExpired]);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const totalMinutes = timeLeft.h * 60 + timeLeft.m;
  const isUrgent = !timeLeft.expired && totalMinutes < 10;
  const displayCode = orderCode || `#${orderId.slice(0, 8).toUpperCase()}`;

  if (timeLeft.expired) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">
              {isVi ? 'Đơn hàng đã hết hạn' : 'Order has expired'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isVi ? 'Mã đơn' : 'Order'}: {displayCode}
            </p>
          </div>
        </div>
        {onCreateNew && (
          <Button variant="outline" size="sm" onClick={onCreateNew} className="gap-1.5 shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />
            {isVi ? 'Tạo đơn mới' : 'Create new order'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl border ${
      isUrgent ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30'
    }`}>
      <div className="flex items-center gap-2">
        <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium tabular-nums ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>
              {isVi ? 'Hết hạn sau' : 'Expires in'}: {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
            </span>
            {isUrgent && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {isVi ? 'Sắp hết hạn' : 'Expiring soon'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isVi ? 'Mã đơn' : 'Order'}: {displayCode}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="text-[10px] shrink-0">
        ⏳ {isVi ? 'Đang chờ thanh toán' : 'Pending payment'}
      </Badge>
    </div>
  );
}
