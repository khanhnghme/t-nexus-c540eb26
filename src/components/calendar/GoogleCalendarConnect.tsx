import { Button } from '@/components/ui/button';
import { RefreshCw, Unlink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GoogleCalendarConnectProps {
  isConnected: boolean;
  isSyncing: boolean;
  isChecking: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}

export default function GoogleCalendarConnect({
  isConnected,
  isSyncing,
  isChecking,
  onConnect,
  onDisconnect,
  onSync,
}: GoogleCalendarConnectProps) {
  if (isChecking) return null;

  if (!isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onConnect}
        className="h-7 gap-1.5 text-xs"
      >
        <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" alt="Google Calendar" className="h-3.5 w-3.5" />
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
            <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" alt="Google Calendar" className="h-3.5 w-3.5" />
          )}
          {isSyncing ? 'Đang đồng bộ...' : 'Đã kết nối'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onSync} disabled={isSyncing}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Đồng bộ ngay
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDisconnect} className="text-destructive">
          <Unlink className="h-4 w-4 mr-2" />
          Ngắt kết nối
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
