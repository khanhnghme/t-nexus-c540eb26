import { useState } from 'react';
import { Unplug, Loader2 } from 'lucide-react';
import gmailLogo from '@/assets/gmail-logo.png';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [showConfirm, setShowConfirm] = useState(false);

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (isConnected) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
            >
              <img src={gmailLogo} alt="Gmail" className="w-3.5 h-3.5" />
              {connectedEmail || g.connected || 'Đã kết nối'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setShowConfirm(true)} className="text-destructive">
              <Unplug className="h-4 w-4 mr-2" />
              {g.disconnectGmail || 'Ngắt kết nối'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{g.disconnectConfirmTitle || 'Ngắt kết nối Gmail?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {g.disconnectConfirmDesc || 'Tất cả email đã đồng bộ sẽ bị xóa. Bạn có thể kết nối lại bất cứ lúc nào.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{g.cancel || 'Hủy'}</AlertDialogCancel>
              <Button
                onClick={() => { onDisconnect(); setShowConfirm(false); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {g.confirmDisconnect || 'Ngắt kết nối'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={onConnect} className="gap-1.5">
      <img src={gmailLogo} alt="Gmail" className="w-4 h-4" />
      {g.connectGmail || 'Connect Gmail'}
    </Button>
  );
}
