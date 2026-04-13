import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LookedUpUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useEmailLookup(email: string) {
  const [previewUser, setPreviewUser] = useState<LookedUpUser | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const lastEmail = useRef('');

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setPreviewUser(null);
      setNotFound(false);
      lastEmail.current = '';
      return;
    }

    if (trimmed === lastEmail.current) return;

    const timer = setTimeout(async () => {
      lastEmail.current = trimmed;
      setIsLooking(true);
      setNotFound(false);
      setPreviewUser(null);

      try {
        const { data } = await supabase.rpc('lookup_user_by_email', { p_email: trimmed });
        if (data && typeof data === 'object' && 'id' in (data as any)) {
          setPreviewUser(data as unknown as LookedUpUser);
          setNotFound(false);
        } else {
          setPreviewUser(null);
          setNotFound(true);
        }
      } catch {
        setPreviewUser(null);
        setNotFound(true);
      } finally {
        setIsLooking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  return { previewUser, isLooking, notFound };
}
