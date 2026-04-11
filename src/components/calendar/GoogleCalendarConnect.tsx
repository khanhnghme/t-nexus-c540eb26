import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import googleCalendarLogo from '@/assets/google-calendar-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, Unlink } from 'lucide-react';

interface GoogleCalendarConnectProps {
  isConnected: boolean;
  isSyncing: boolean;
  isChecking: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync: () => void;
}

export default function GoogleCalendarConnect({
  isConnected,
  isSyncing,
  isChecking,
  onSync,
}: GoogleCalendarConnectProps) {
  const navigate = useNavigate();

  if (isChecking) return null;

  const goToSettings = () => navigate('/account-settings#integrations');

  if (!isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={goToSettings}
        className="h-7 gap-1.5 text-xs"
      >
        <img src={googleCalendarLogo} alt="Google Calendar" className="h-3.5 w-3.5" />
        Google Calendar
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
          disabled={isSyncing}
        >
          {isSyncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <img src={googleCalendarLogo} alt="Google Calendar" className="h-3.5 w-3.5" />
          )}
          {isSyncing ? 'Đang đồng bộ...' : 'Đã kết nối'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onSync} disabled={isSyncing}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Đồng bộ ngay
        </DropdownMenuItem>
        <DropdownMenuItem onClick={goToSettings}>
          <Settings className="h-4 w-4 mr-2" />
          Quản lý kết nối
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
