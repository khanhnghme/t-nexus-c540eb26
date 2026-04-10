import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useGmailSync } from '@/hooks/useGmailSync';
import { useGoogleDriveConnect } from '@/hooks/useGoogleDriveConnect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link2, Unlink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import googleCalendarLogo from '@/assets/google-calendar-logo.png';
import gmailLogo from '@/assets/gmail-logo.png';
import googleDriveLogo from '@/assets/google-drive-logo.png';

interface ServiceInfo {
  key: string;
  logo: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  isConnected: boolean;
  isChecking: boolean;
  email?: string | null;
  onConnect: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
}

function ServiceCard({ service, isVi }: { service: ServiceInfo; isVi: boolean }) {
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await service.onDisconnect();
    } finally {
      setDisconnecting(false);
      setDisconnectTarget(null);
    }
  };

  if (service.isChecking) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-2xl border p-6 transition-all flex flex-col ${
          service.isConnected
            ? 'border-primary/20 bg-primary/[0.03] shadow-sm'
            : 'border-border bg-card hover:border-muted-foreground/20 hover:shadow-sm'
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <img
            src={service.logo}
            alt={service.name}
            className="w-12 h-12 rounded-xl object-contain flex-shrink-0"
            loading="lazy"
            width={48}
            height={48}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold">{isVi ? service.nameVi : service.name}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isVi ? service.descriptionVi : service.description}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="mb-4">
          {service.isConnected ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {isVi ? 'Đã kết nối' : 'Connected'}
                </p>
                {service.email && (
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 truncate">{service.email}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                {isVi ? 'Chưa kết nối' : 'Not connected'}
              </p>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="mt-auto">
          {service.isConnected ? (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => setDisconnectTarget(service.key)}
            >
              <Unlink className="w-3.5 h-3.5" />
              {isVi ? 'Ngắt kết nối' : 'Disconnect'}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => service.onConnect()}
            >
              <Link2 className="w-3.5 h-3.5" />
              {isVi ? 'Kết nối' : 'Connect'}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={disconnectTarget === service.key} onOpenChange={(o) => !o && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isVi
                ? `Ngắt kết nối ${service.nameVi}?`
                : `Disconnect ${service.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isVi
                ? 'Bạn sẽ cần kết nối lại để sử dụng tính năng này. Dữ liệu đã đồng bộ sẽ không bị xóa.'
                : 'You will need to reconnect to use this feature again. Previously synced data will not be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>
              {isVi ? 'Hủy' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} disabled={disconnecting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {disconnecting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isVi ? 'Xác nhận ngắt' : 'Confirm Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ConnectedServicesCard() {
  const { locale } = useLanguage();
  const isVi = locale === 'vi';

  const calendar = useGoogleCalendarSync();
  const gmail = useGmailSync();
  const drive = useGoogleDriveConnect();

  const services: ServiceInfo[] = [
    {
      key: 'calendar',
      logo: googleCalendarLogo,
      name: 'Google Calendar',
      nameVi: 'Google Calendar',
      description: 'Sync events between system and Google Calendar',
      descriptionVi: 'Đồng bộ sự kiện giữa hệ thống và Google Calendar',
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
      nameVi: 'Gmail',
      description: 'Read and sync emails from your Gmail inbox',
      descriptionVi: 'Đọc và đồng bộ email từ hộp thư Gmail',
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
      nameVi: 'Google Drive',
      description: 'Attach files from Google Drive to tasks',
      descriptionVi: 'Đính kèm tệp từ Google Drive vào công việc',
      isConnected: drive.isConnected,
      isChecking: drive.isChecking,
      email: drive.emailAddress,
      onConnect: drive.connect,
      onDisconnect: drive.disconnect,
    },
  ];

  const connectedCount = services.filter(s => s.isConnected).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            {isVi ? 'Dịch vụ liên kết' : 'Connected Services'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isVi
              ? 'Quản lý liên kết với các dịch vụ Google'
              : 'Manage connections to Google services'}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {connectedCount}/{services.length} {isVi ? 'đã kết nối' : 'connected'}
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <ServiceCard key={s.key} service={s} isVi={isVi} />
        ))}
      </div>
    </div>
  );
}
