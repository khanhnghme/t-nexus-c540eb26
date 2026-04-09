import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { StickyNote, Plus, MessageSquare } from 'lucide-react';

const NOTE_TYPES = ['general', 'warning', 'vip', 'abuse', 'support', 'partner'] as const;
type NoteType = typeof NOTE_TYPES[number];

const TYPE_COLORS: Record<NoteType, string> = {
  general: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  vip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  abuse: 'bg-destructive/10 text-destructive',
  support: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  partner: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

interface Props {
  userId: string;
  canAddNote?: boolean;
}

export function UserNotesTab({ userId, canAddNote = true }: Props) {
  const { translations } = useLanguage();
  const t = translations.app?.adminBilling?.notes;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('general');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['admin-notes', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch creator names
      const creatorIds = [...new Set(data.map(n => n.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));

      return data.map(n => ({ ...n, creator_name: nameMap[n.created_by] || 'Unknown' }));
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('admin_notes').insert({
        user_id: userId,
        created_by: user.id,
        content,
        note_type: noteType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes', userId] });
      setContent('');
      setNoteType('general');
      toast({ title: t?.noteAdded || 'Note added' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const typeLabel = (type: string) => t?.types?.[type] || type;

  return (
    <div className="space-y-6 mt-4">
      {/* Add note form */}
      {canAddNote && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t?.addTitle || 'Add Internal Note'}
          </h3>
          <div className="flex gap-2">
            <Select value={noteType} onValueChange={v => setNoteType(v as NoteType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map(nt => (
                  <SelectItem key={nt} value={nt}>
                    <Badge className={`${TYPE_COLORS[nt]} text-xs`} variant="secondary">{typeLabel(nt)}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
          </div>
          <Textarea
            placeholder={t?.placeholder || 'Write your internal note here...'}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={!content.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
              {addNote.isPending ? (t?.adding || 'Adding...') : (t?.addButton || 'Add Note')}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">{t?.empty || 'No internal notes yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  <Badge className={TYPE_COLORS[note.note_type as NoteType] || TYPE_COLORS.general} variant="secondary">
                    {typeLabel(note.note_type)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground">
                {t?.by || 'By'}: {note.creator_name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
