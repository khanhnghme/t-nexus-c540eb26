import { useState, useEffect } from 'react';
import { deleteWithUndo } from '@/lib/deleteWithUndo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  AlertTriangle,
  Trash2,
  Search,
  RefreshCw,
  Clock,
  Bug,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ErrorLog {
  id: string;
  error_message: string;
  error_type: string;
  error_stack: string | null;
  component: string | null;
  url: string | null;
  user_id: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  occurrence_count: number;
  last_occurred_at: string;
}

export default function SystemErrorLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('system_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs((data as ErrorLog[]) || []);
    } catch (error: any) {
      console.warn('Failed to fetch error logs:', error.message);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    const savedLogs = [...logs];
    setLogs([]);
    setShowClearConfirm(false);

    deleteWithUndo({
      description: 'Đã xóa toàn bộ log lỗi',
      onDelete: async () => {
        const { error } = await (supabase as any)
          .from('system_error_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      },
      onUndo: () => {
        setLogs(savedLogs);
      },
    });
  };

  const getErrorTypeConfig = (type: string) => {
    switch (type) {
      case 'runtime':
        return { label: 'Runtime', icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/30' };
      case 'promise_rejection':
        return { label: 'Promise', icon: AlertTriangle, color: 'bg-warning/10 text-warning border-warning/30' };
      case 'console_error':
        return { label: 'Console', icon: Bug, color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' };
      case 'network':
        return { label: 'Network', icon: AlertCircle, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
      default:
        return { label: type, icon: Bug, color: 'bg-muted text-muted-foreground' };
    }
  };

  const errorTypes = ['all', ...new Set(logs.map(l => l.error_type))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.component?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.url?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || log.error_type === filterType;
    return matchesSearch && matchesType;
  });

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss", { locale: vi });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm log lỗi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 flex-wrap">
            {errorTypes.map(type => {
              const config = type === 'all'
                ? { label: 'Tất cả', color: '' }
                : getErrorTypeConfig(type);
              return (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                  className="text-xs"
                >
                  {config.label}
                </Button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {logs.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowClearConfirm(true)} className="gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              Xóa tất cả
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <Bug className="w-3 h-3" />
          {filteredLogs.length} log
        </Badge>
        {filterType !== 'all' && (
          <Badge variant="outline" className="gap-1">
            Lọc: {getErrorTypeConfig(filterType).label}
          </Badge>
        )}
      </div>

      {/* Log List */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bug className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">
              {logs.length === 0 ? 'Chưa có log lỗi' : 'Không tìm thấy kết quả'}
            </h3>
            <p className="text-muted-foreground">
              {logs.length === 0
                ? 'Hệ thống đang hoạt động ổn định'
                : 'Thử thay đổi từ khóa tìm kiếm'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
          <div className="space-y-2 pr-4">
            {filteredLogs.map(log => {
              const config = getErrorTypeConfig(log.error_type);
              const TypeIcon = config.icon;
              const isExpanded = expandedLog === log.id;

              return (
                <Card
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <TypeIcon className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                            {config.label}
                          </Badge>
                          {log.occurrence_count > 1 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              ×{log.occurrence_count}
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.last_occurred_at || log.created_at)}
                          </span>
                          {log.component && (
                            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                              {log.component}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono break-all line-clamp-2">
                          {log.error_message}
                        </p>

                        {isExpanded && (
                          <div className="mt-3 space-y-2 text-xs">
                            {log.error_stack && (
                              <div>
                                <span className="font-semibold text-muted-foreground">Stack trace:</span>
                                <pre className="mt-1 p-2 rounded bg-muted/50 overflow-x-auto text-[10px] font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
                                  {log.error_stack}
                                </pre>
                              </div>
                            )}
                            {log.url && (
                              <div>
                                <span className="font-semibold text-muted-foreground">URL: </span>
                                <span className="font-mono break-all">{log.url}</span>
                              </div>
                            )}
                            {log.user_agent && (
                              <div>
                                <span className="font-semibold text-muted-foreground">User Agent: </span>
                                <span className="font-mono break-all text-[10px]">{log.user_agent}</span>
                              </div>
                            )}
                            {log.metadata && (
                              <div>
                                <span className="font-semibold text-muted-foreground">Metadata: </span>
                                <pre className="mt-1 p-2 rounded bg-muted/50 overflow-x-auto text-[10px] font-mono">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Clear All Confirm */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa toàn bộ log lỗi?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa tất cả {logs.length} log lỗi. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Hủy</AlertDialogCancel>
            <Button
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isClearing}
            >
              {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xóa tất cả'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
