import { Outlet, useNavigate } from 'react-router-dom';
import { DashboardLayoutProvider, useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Minimal header */}
      <header className="h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/onboarding')}
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
