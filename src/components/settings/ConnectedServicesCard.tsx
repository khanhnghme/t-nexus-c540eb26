import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useGmailSync } from '@/hooks/useGmailSync';
import { useGoogleDriveConnect } from '@/hooks/useGoogleDriveConnect';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import googleCalendarLogo from '@/assets/google-calendar-logo.png';
import gmailLogo from '@/assets/gmail-logo.png';
import googleDriveLogo from '@/assets/google-drive-logo.png';

interface ServiceInfo {
  key: string;
  logo: string;
  name: string;
  description: string;
  isConnected: boolean;
  isChecking: boolean;
  email?: string | null;
  onConnect: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
}

export default function ConnectedServicesCard() {
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const calendar = useGoogleCalendarSync();
  const gmail = useGmailSync();
  const drive = useGoogleDriveConnect();

  const services: ServiceInfo[] = [
    {
      key: 'calendar',
      logo: googleCalendarLogo,
      name: 'Google Calendar',
      description: isVi ? 'Đồng bộ sự kiện' : 'Sync events',
      isConnected: calendar.isConnected,
      isChecking: calendar.isChecking,
      email: calendar.connectedEmail,
      onConnect: calendar.connect,
      onDisconnect: calendar.disconnect,
    },
    {
      key: 'gmail',
      logo: gmailLogo,
      name: 'Gmail',
      description: isVi ? 'Đồng bộ email' : 'Sync emails',
      isConnected: gmail.isConnected,
      isChecking: gmail.isChecking,
      email: gmail.connectedEmail,
      onConnect: gmail.connect,
      onDisconnect: gmail.disconnect,
    },
    {
      key: 'drive',
      logo: googleDriveLogo,
      name: 'Google Drive',
      description: isVi ? 'Đính kèm tệp' : 'Attach files',
      isConnected: drive.isConnected,
      isChecking: drive.isChecking,
      email: drive.emailAddress,
      onConnect: drive.connect,
      onDisconnect: drive.disconnect,
    },
  ];

  const targetService = services.find(s => s.key === disconnectTarget);

  const handleDisconnect = async () => {
    if (!targetService) return;
    setDisconnecting(true);
    try {
      await targetService.onDisconnect();
    } finally {
      setDisconnecting(false);
      setDisconnectTarget(null);
    }
  };

  return (
    <>
      <div className="divide-y divide-border">
        {services.map((s) => (
          <div key={s.key} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
            {s.isChecking ? (
              <>
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </>
            ) : (
              <>
                <img
                  src={s.logo}
                  alt={s.name}
                  className="w-8 h-8 rounded-lg object-contain shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.isConnected && s.email ? s.email : s.description}
                  </p>
                </div>
                {s.isConnected ? (
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isVi ? 'Đã kết nối' : 'Connected'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setDisconnectTarget(s.key)}
                    >
                      {isVi ? 'Ngắt' : 'Disconnect'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs shrink-0"
                    onClick={() => s.onConnect()}
                  >
                    {isVi ? 'Kết nối' : 'Connect'}
                  </Button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!disconnectTarget} onOpenChange={(o) => !o && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isVi
                ? `Ngắt kết nối ${targetService?.name}?`
                : `Disconnect ${targetService?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isVi
                ? 'Bạn sẽ cần kết nối lại để sử dụng tính năng này.'
                : 'You will need to reconnect to use this feature again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>
              {isVi ? 'Hủy' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} disabled={disconnecting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {disconnecting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isVi ? 'Xác nhận' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
