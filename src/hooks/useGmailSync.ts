import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export function useGmailSync() {
  const { user } = useAuth();
  const { translations: { app: t } } = useLanguage();
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (!user?.id) { setIsChecking(false); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsChecking(false); return; }

      const res = await supabase.functions.invoke('gmail-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'status' },
      });

      if (res.data) {
        setIsConnected(!!res.data.connected);
        setConnectedEmail(res.data.email || null);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, [user?.id]);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  // Check URL params for callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get('gmail');
    if (gmail === 'connected') {
      toast.success(t?.gmail?.syncSuccess || 'Gmail connected successfully!');
      setIsConnected(true);
      checkConnection();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gmail === 'error') {
      toast.error(t?.gmail?.syncError || 'Failed to connect Gmail. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke('gmail-auth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (err: any) {
      toast.error(t?.gmail?.syncError || 'Cannot connect Gmail');
      console.error(err);
    }
  }, [user?.id, t]);

  const disconnect = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('gmail-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'disconnect' },
      });

      setIsConnected(false);
      setConnectedEmail(null);
      toast.success(t?.gmail?.disconnected || 'Gmail disconnected');
    } catch (err: any) {
      toast.error(t?.gmail?.syncError || 'Cannot disconnect Gmail');
      console.error(err);
    }
  }, [user?.id, t]);

  const syncEmails = useCallback(async () => {
    if (!user?.id || !isConnected) return;
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke('gmail-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'sync' },
      });

      if (res.error) throw res.error;
      const synced = res.data?.synced || 0;
      if (synced > 0) {
        toast.success(`${t?.gmail?.syncSuccess || 'Synced'} ${synced} emails`);
      } else {
        toast.info(t?.gmail?.noNewEmails || 'No new emails');
      }
      return res.data;
    } catch (err: any) {
      toast.error(t?.gmail?.syncError || 'Gmail sync failed');
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, isConnected, t]);

  return { isConnected, isSyncing, isChecking, connectedEmail, connect, disconnect, syncEmails, checkConnection };
}
