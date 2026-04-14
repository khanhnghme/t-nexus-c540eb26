import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { Stage } from '@/types/database';
import { deleteWithUndo } from '@/lib/deleteWithUndo';
import { useReadOnlyGuard } from '@/components/ReadOnlyGuard';

interface StageManagementProps {
  stage: Stage;
  taskCount: number;
  onUpdate: () => void;
}

export default function StageManagement({ stage, taskCount, onUpdate }: StageManagementProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newName, setNewName] = useState(stage.name);

  const { guardAction: guardReadOnly } = useReadOnlyGuard();

  const handleRename = async () => {
    if (guardReadOnly()) return;
    if (!newName.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Tên giai đoạn không được để trống',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('stages')
        .update({ name: newName.trim() })
        .eq('id', stage.id);

      if (error) throw error;

      toast({ title: 'Thành công', description: 'Đã đổi tên giai đoạn' });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'RENAME_STAGE', actionType: 'stage',
          description: `Đổi tên giai đoạn "${stage.name}" → "${newName.trim()}"`,
          groupId: stage.group_id,
        });
      }
      setIsRenameDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể đổi tên giai đoạn',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteDialogOpen(false);

    deleteWithUndo({
      description: taskCount > 0
        ? `Đã xóa giai đoạn "${stage.name}". ${taskCount} task chuyển sang "Chưa phân giai đoạn"`
        : `Đã xóa giai đoạn "${stage.name}"`,
      onDelete: async () => {
        await supabase.from('tasks').update({ stage_id: null }).eq('stage_id', stage.id);
        const { error } = await supabase.from('stages').delete().eq('id', stage.id);
        if (error) throw error;
        if (user && profile) {
          await logActivity({
            userId: user.id, userName: profile.full_name,
            action: 'DELETE_STAGE', actionType: 'stage',
            description: `Xóa giai đoạn "${stage.name}"${taskCount > 0 ? ` (${taskCount} task chuyển về chưa phân giai đoạn)` : ''}`,
            groupId: stage.group_id,
          });
        }
        onUpdate();
      },
      onUndo: () => {
        onUpdate();
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => {
            setNewName(stage.name);
            setIsRenameDialogOpen(true);
          }}>
            <Pencil className="w-4 h-4 mr-2" />
            Đổi tên
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa giai đoạn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên giai đoạn</DialogTitle>
            <DialogDescription>
              Nhập tên mới cho giai đoạn "{stage.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Tên giai đoạn</Label>
              <Input
                id="stage-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tên giai đoạn"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleRename} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Lưu'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa giai đoạn "{stage.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {taskCount > 0 ? (
                <>
                  Giai đoạn này có <span className="font-bold text-foreground">{taskCount} task</span>. 
                  Các task sẽ được chuyển sang "Chưa phân giai đoạn" thay vì bị xóa.
                </>
              ) : (
                'Giai đoạn này không có task nào. Bạn có chắc chắn muốn xóa?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Xóa giai đoạn'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
