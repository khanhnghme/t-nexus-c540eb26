import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EVENT_COLORS } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialDate?: Date;
  editEvent?: {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    color: string;
  } | null;
}

export default function CreateEventDialog({ open, onOpenChange, onSuccess, initialDate, editEvent }: CreateEventDialogProps) {
  const { user } = useAuth();
  const { translations: { app: t } } = useLanguage();
  const cal = t.calendar;
  const isEdit = !!editEvent;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startHour, setStartHour] = useState('09');
  const [endDate, setEndDate] = useState('');
  const [endHour, setEndHour] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0].value);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description || '');
      setStartDate(format(new Date(editEvent.start_time), 'yyyy-MM-dd'));
      setStartHour(format(new Date(editEvent.start_time), 'HH'));
      setEndDate(editEvent.end_time ? format(new Date(editEvent.end_time), 'yyyy-MM-dd') : '');
      setEndHour(editEvent.end_time ? format(new Date(editEvent.end_time), 'HH') : '');
      setColor(editEvent.color || EVENT_COLORS[0].value);
    } else {
      setTitle('');
      setDescription('');
      setStartDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : '');
      setStartHour('09');
      setEndDate('');
      setEndHour('');
      setColor(EVENT_COLORS[0].value);
    }
    setLoading(false);
  }, [open, editEvent, initialDate]);

  const startTime = startDate ? `${startDate}T${startHour}:00` : '';
  const endTime = endDate && endHour ? `${endDate}T${endHour}:00` : '';
  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  const handleSubmit = async () => {
    if (!title.trim() || !startTime || !user) return;
    setLoading(true);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('personal_events')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            start_time: new Date(startTime).toISOString(),
            end_time: endTime ? new Date(endTime).toISOString() : null,
            color,
          })
          .eq('id', editEvent!.id);
        if (error) throw error;
        toast.success(cal.eventUpdated);
      } else {
        const { error } = await supabase
          .from('personal_events')
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim() || null,
            start_time: new Date(startTime).toISOString(),
            end_time: endTime ? new Date(endTime).toISOString() : null,
            color,
          });
        if (error) throw error;
        toast.success(cal.eventCreated);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || cal.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editEvent) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('personal_events').delete().eq('id', editEvent.id);
      if (error) throw error;
      toast.success(cal.eventDeleted);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || cal.errorOccurred);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? cal.editEvent : cal.createPersonalEvent}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{cal.titleLabel}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={cal.titlePlaceholder} />
          </div>

          <div className="space-y-2">
            <Label>{cal.descriptionLabel}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={cal.descPlaceholder} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{cal.startLabel}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <select value={startHour} onChange={(e) => setStartHour(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {HOURS.map((h) => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{cal.endLabel} <span className="text-muted-foreground text-xs">{cal.endOptional}</span></Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <select value={endHour} onChange={(e) => setEndHour(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">--</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{cal.colorLabel}</Label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    color === c.value && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {isEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading} className="mr-auto gap-1">
              <Trash2 className="h-3.5 w-3.5" />
              {cal.deleteBtn}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{cal.cancelBtn}</Button>
            <Button onClick={handleSubmit} disabled={loading || !title.trim() || !startTime}>
              {isEdit ? cal.updateBtn : cal.createBtn}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
