import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Eye } from 'lucide-react';
import { format } from 'date-fns';

const PLAN_LABELS: Record<string, string> = {
  plan_free: 'Free',
  plan_plus: 'Plus',
  plan_pro: 'Pro',
  plan_business: 'Business',
  plan_custom: 'Custom',
};

const PLAN_COLORS: Record<string, string> = {
  plan_free: 'bg-muted text-muted-foreground',
  plan_plus: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  plan_pro: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  plan_business: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  plan_custom: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  expired: 'bg-destructive/10 text-destructive',
  trial: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  suspended: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  grace_period: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function AdminBilling() {
  const navigate = useNavigate();
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling;
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-billing-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, user_plan, plan_status, plan_source, plan_expires_at, billing_cycle, auto_renew')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return users.filter((u: any) => {
      const matchSearch = !search || 
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchPlan = planFilter === 'all' || u.user_plan === planFilter;
      const matchStatus = statusFilter === 'all' || u.plan_status === statusFilter;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [users, search, planFilter, statusFilter]);

  const statusLabel = (s: string) => t?.planStatus?.[s] || s;
  const planLabel = (p: string) => PLAN_LABELS[p] || p;

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <h1 className="text-xl font-semibold">{t?.title || 'User Billing Management'}</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t?.searchPlaceholder || 'Search...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t?.filterByPlan || 'All Plans'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t?.filterByPlan || 'All Plans'}</SelectItem>
            {Object.keys(PLAN_LABELS).map(k => (
              <SelectItem key={k} value={k}>{PLAN_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t?.filterByStatus || 'All Statuses'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t?.filterByStatus || 'All Statuses'}</SelectItem>
            {['active', 'expired', 'trial', 'suspended', 'cancelled', 'grace_period'].map(s => (
              <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t?.noUsers || 'No users found'}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t?.columns?.user || 'User'}</TableHead>
              <TableHead>{t?.columns?.plan || 'Plan'}</TableHead>
              <TableHead>{t?.columns?.status || 'Status'}</TableHead>
              <TableHead>{t?.columns?.source || 'Source'}</TableHead>
              <TableHead>{t?.columns?.cycle || 'Cycle'}</TableHead>
              <TableHead>{t?.columns?.expiresAt || 'Expires'}</TableHead>
              <TableHead className="w-[80px]">{t?.columns?.actions || 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user: any) => (
              <TableRow key={user.id} className="cursor-pointer" onClick={() => navigate(`/admin/billing/${user.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-xs">{user.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{user.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={PLAN_COLORS[user.user_plan] || ''} variant="secondary">
                    {planLabel(user.user_plan)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[user.plan_status] || ''} variant="secondary">
                    {statusLabel(user.plan_status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t?.planSource?.[user.plan_source] || user.plan_source}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t?.billingCycle?.[user.billing_cycle] || user.billing_cycle}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.plan_expires_at ? format(new Date(user.plan_expires_at), 'dd/MM/yyyy') : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={e => { e.stopPropagation(); navigate(`/admin/billing/${user.id}`); }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
