import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutDashboard, Users, Layers, Receipt, Tag } from 'lucide-react';
import { AdminBillingDashboard } from '@/components/admin/AdminBillingDashboard';
import { AdminBillingUsersTab } from '@/components/admin/AdminBillingUsersTab';
import { AdminPlansTab } from '@/components/admin/AdminPlansTab';
import { AdminTransactionsTab } from '@/components/admin/AdminTransactionsTab';
import { AdminCouponsTab } from '@/components/admin/AdminCouponsTab';

export default function AdminBilling() {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling;

  const tabs = [
    { value: 'overview', label: t?.tabs?.overview || 'Overview', icon: LayoutDashboard },
    { value: 'users', label: t?.columns?.user || 'Users', icon: Users },
    { value: 'plans', label: t?.plans?.title || 'Plans', icon: Layers },
    { value: 'transactions', label: t?.transactions?.title || 'Transactions', icon: Receipt },
    { value: 'coupons', label: t?.coupons?.title || 'Coupons', icon: Tag },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-semibold">{t?.title || 'Billing Management'}</h1>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs sm:text-sm">
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><AdminBillingDashboard /></TabsContent>
        <TabsContent value="users"><AdminBillingUsersTab /></TabsContent>
        <TabsContent value="plans"><AdminPlansTab /></TabsContent>
        <TabsContent value="transactions"><AdminTransactionsTab /></TabsContent>
        <TabsContent value="coupons"><AdminCouponsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
