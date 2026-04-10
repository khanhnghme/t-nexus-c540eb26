import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayoutProvider, useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import tNexusLogo from '@/assets/t-nexus-text-white.png';

function DashboardCheckout() {
  const { projectInfo } = useDashboardLayoutContext();
  return (
    <DashboardLayout
      useOutlet
      projectId={projectInfo.projectId}
      projectName={projectInfo.projectName}
      zaloLink={projectInfo.zaloLink}
    />
  );
}

function MinimalCheckoutLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPaymentPage = location.pathname.startsWith('/checkout/payment');
  const isVi = document.documentElement.lang === 'vi';

  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Read expires_at from sessionStorage (set by CheckoutPayment)
  useEffect(() => {
    if (!showBackConfirm) return;
    const expiresAt = sessionStorage.getItem('checkout_payment_expires_at');
    if (!expiresAt) { setTimeLeft('--:--'); return; }

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('00:00'); return; }
      const mm = Math.floor(diff / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [showBackConfirm]);

  const handleBackClick = () => {
    if (isPaymentPage) {
      setShowBackConfirm(true);
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Minimal header */}
      <header className="h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleBackClick}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Button>
        <div className="flex-1" />
        <img
          src={tNexusLogo}
          alt="T-Nexus"
          className="h-5 object-contain brightness-0 dark:brightness-100"
        />
      </header>

      {/* Back confirmation dialog for payment page */}
      <Dialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isVi ? 'Rời khỏi trang thanh toán?' : 'Leave payment page?'}</DialogTitle>
            <DialogDescription>
              {isVi
                ? `Bạn còn đơn hàng chưa thanh toán. Có thể hoàn tất sau trong lịch sử. Còn lại: ${timeLeft}.`
                : `You have an unpaid order. You can complete it later in history. Remaining: ${timeLeft}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBackConfirm(false);
              navigate('/onboarding');
            }}>
              {isVi ? 'Quay lại' : 'Go back'}
            </Button>
            <Button onClick={() => setShowBackConfirm(false)}>
              {isVi ? 'Tiếp tục thanh toán' : 'Continue payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function CheckoutLayoutWrapper() {
  const isFromOnboarding = sessionStorage.getItem('checkout_from') === 'onboarding';

  if (isFromOnboarding) {
    return <MinimalCheckoutLayout />;
  }

  return (
    <DashboardLayoutProvider>
      <DashboardCheckout />
    </DashboardLayoutProvider>
  );
}
