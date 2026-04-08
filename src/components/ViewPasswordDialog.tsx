import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Copy, KeyRound, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ViewPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export default function ViewPasswordDialog({ open, onOpenChange, userId, userName }: ViewPasswordDialogProps) {
  const { isAdmin } = useAuth();
  const { translations: { app: { viewPassword: t } } } = useLanguage();
  const { toast } = useToast();
  const [password, setPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (open && isAdmin && userId) {
      setRevealed(false);
      setIsLoading(true);
      supabase
        .from('demo_passwords')
        .select('plain_password')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          setPassword(data?.plain_password ?? null);
          setIsLoading(false);
        });
    }
  }, [open, userId, isAdmin]);

  const handleCopy = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      toast({ title: t.copied });
    }
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="w-5 h-5 text-primary" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-destructive">{t.warning}</span> {t.warningDesc}
            </p>
          </div>

          {/* User info */}
          <div>
            <p className="text-sm font-medium">{userName}</p>
          </div>

          {/* Password display */}
          <div className="rounded-md border bg-muted/30 p-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">{t.loading}</p>
            ) : password ? (
              <div className="space-y-2">
                {!revealed ? (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setRevealed(true)}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    {t.reveal}
                  </Button>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono font-semibold break-all">{password}</code>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t.noData}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
