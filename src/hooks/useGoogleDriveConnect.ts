import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useGoogleDriveConnect() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [emailAddress, setEmailAddress] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (!user) { setIsChecking(false); return; }
    try {
      const { data } = await supabase
        .from('google_drive_tokens')
        .select('user_id, email_address')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsConnected(!!data);
      setEmailAddress(data?.email_address || null);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, [user]);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  // Listen for redirect query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gdrive = params.get('gdrive');
    if (gdrive === 'connected') {
      toast({ title: 'Đã kết nối Google Drive' });
      setIsConnected(true);
      checkConnection();
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('gdrive');
      window.history.replaceState({}, '', url.toString());
    } else if (gdrive === 'error') {
      toast({ title: 'Không thể kết nối Google Drive', variant: 'destructive' });
      const url = new URL(window.location.href);
      url.searchParams.delete('gdrive');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const connect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: 'Vui lòng đăng nhập', variant: 'destructive' }); return; }

      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Drive connect error:', err);
      toast({ title: 'Lỗi kết nối Google Drive', variant: 'destructive' });
    }
  };

  const disconnect = async () => {
    if (!user) return;
    try {
      await supabase.from('google_drive_tokens').delete().eq('user_id', user.id);
      setIsConnected(false);
      setEmailAddress(null);
      toast({ title: 'Đã ngắt kết nối Google Drive' });
    } catch {
      toast({ title: 'Lỗi ngắt kết nối', variant: 'destructive' });
    }
  };

  const getPickerToken = async (): Promise<{ access_token: string; client_id: string } | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke('google-drive-picker-token', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.code === 'NOT_CONNECTED' || data?.code === 'TOKEN_EXPIRED') {
        setIsConnected(false);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  return {
    isConnected,
    isChecking,
    emailAddress,
    connect,
    disconnect,
    getPickerToken,
    checkConnection,
  };
}
