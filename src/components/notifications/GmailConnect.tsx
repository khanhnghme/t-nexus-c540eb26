import { Mail, Unplug, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface GmailConnectProps {
  isConnected: boolean;
  isChecking: boolean;
  connectedEmail: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function GmailConnect({ isConnected, isChecking, connectedEmail, onConnect, onDisconnect }: GmailConnectProps) {
  const { translations: { app: t } } = useLanguage();
  const g = t?.gmail || {} as any;

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">{connectedEmail || g.connected || 'Connected'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onDisconnect} className="gap-1.5 text-xs text-destructive hover:text-destructive">
          <Unplug className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{g.disconnectGmail || 'Disconnect'}</span>
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={onConnect} className="gap-1.5">
      <Mail className="w-4 h-4" />
      {g.connectGmail || 'Connect Gmail'}
    </Button>
  );
}
