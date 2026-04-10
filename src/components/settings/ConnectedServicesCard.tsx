import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useGmailSync } from '@/hooks/useGmailSync';
import { useGoogleDriveConnect } from '@/hooks/useGoogleDriveConnect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Mail, HardDrive, Link2, Unlink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ServiceInfo {
  key: string;
  icon: React.ElementType;
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
  const Icon = service.icon;

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
      <div className="rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-xl border p-5 transition-all ${
          service.isConnected
            ? 'border-primary/20 bg-primary/5'
            : 'border-border bg-card hover:border-muted-foreground/20'
        }`}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2.5 rounded-lg ${service.isConnected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold">{isVi ? service.nameVi : service.name}</p>
              {service.isConnected ? (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-[18px] bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
                  <CheckCircle2 className="w-3 h-3 mr-0.5" />
                  {isVi ? 'Đã kết nối' : 'Connected'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[18px] text-muted-foreground">
                  <XCircle className="w-3 h-3 mr-0.5" />
                  {isVi ? 'Chưa kết nối' : 'Not connected'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{isVi ? service.descriptionVi : service.description}</p>
            {service.isConnected && service.email && (
              <p className="text-xs text-primary/80 mt-1 truncate">{service.email}</p>
            )}
          </div>
        </div>

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
      icon: Calendar,
      name: 'Google Calendar',
      nameVi: 'Google Calendar',
      description: 'Sync events between system and Google Calendar',
      descriptionVi: 'Đồng bộ sự kiện giữa hệ thống và Google Calendar',
      isConnected: calendar.isConnected,
      isChecking: calendar.isChecking,
      onConnect: calendar.connect,
      onDisconnect: calendar.disconnect,
    },
    {
      key: 'gmail',
      icon: Mail,
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
      icon: HardDrive,
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          {isVi ? 'Dịch vụ đã kết nối' : 'Connected Services'}
        </CardTitle>
        <CardDescription>
          {isVi
            ? 'Quản lý liên kết với các dịch vụ của Google'
            : 'Manage connections to Google services'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {services.map((s) => (
            <ServiceCard key={s.key} service={s} isVi={isVi} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
