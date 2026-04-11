import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export function useGoogleCalendarSync() {
  const { user } = useAuth();
  const { locale, translations: { app: t } } = useLanguage();
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (!user?.id) { setIsChecking(false); return; }
    try {
      const { data } = await supabase
        .from('google_calendar_tokens')
        .select('id, email_address')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsConnected(!!data);
      setConnectedEmail((data as any)?.email_address || null);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, [user?.id]);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  // Check URL params for connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get('gcal');
    if (gcal === 'connected') {
      toast.success('Google Calendar đã kết nối thành công!');
      setIsConnected(true);
      checkConnection();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gcal === 'error') {
      toast.error('Kết nối Google Calendar thất bại. Vui lòng thử lại.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke('google-calendar-auth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (err: any) {
      toast.error('Không thể kết nối Google Calendar');
      console.error(err);
    }
  }, [user?.id]);

  const disconnect = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('google-calendar-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'disconnect' },
      });

      setIsConnected(false);
      setConnectedEmail(null);
      toast.success('Đã ngắt kết nối Google Calendar');
    } catch (err: any) {
      toast.error('Không thể ngắt kết nối');
      console.error(err);
    }
  }, [user?.id]);

  const sync = useCallback(async () => {
    if (!user?.id || !isConnected || isSyncing) return;
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke('google-calendar-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'sync' },
      });

      if (res.error) {
        // Handle 429 sync_in_progress gracefully
        // supabase.functions.invoke may put parsed body in res.data or in error.context
        const errorBody = res.data;
        if (errorBody?.error === 'sync_in_progress') {
          toast.info(locale === 'vi' ? 'Đồng bộ đang chạy, vui lòng đợi...' : 'Sync is already in progress, please wait...');
          return;
        }
        throw res.error;
      }
      const { push, pull } = res.data;
      const total = (push?.created || 0) + (push?.updated || 0) + (pull?.created || 0) + (pull?.updated || 0);
      if (total > 0) {
        toast.success(locale === 'vi' ? `Đã đồng bộ ${total} sự kiện với Google Calendar` : `Synced ${total} events with Google Calendar`);
      } else {
        toast.info(locale === 'vi' ? 'Google Calendar đã đồng bộ, không có thay đổi mới' : 'Google Calendar synced, no new changes');
      }
      return res.data;
    } catch (err: any) {
      // Also catch sync_in_progress from FunctionsHttpError
      const msg = err?.message || '';
      if (msg.includes('sync_in_progress') || msg.includes('429')) {
        toast.info(locale === 'vi' ? 'Đồng bộ đang chạy, vui lòng đợi...' : 'Sync is already in progress, please wait...');
        return;
      }
      toast.error(locale === 'vi' ? 'Đồng bộ Google Calendar thất bại' : 'Google Calendar sync failed');
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, isConnected]);

  return { isConnected, isSyncing, isChecking, connectedEmail, connect, disconnect, sync, checkConnection };
}
