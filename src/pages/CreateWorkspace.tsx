import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';
import { useReadOnlyGuard } from '@/components/ReadOnlyGuard';

export default function CreateWorkspace() {
  const { user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const { translations: { app: t } } = useLanguage();
  const cw = t.createWorkspace;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { guardAction: guardReadOnly } = useReadOnlyGuard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly()) return;
    if (!user || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('workspace-management', {
        body: { action: 'create_workspace', name: name.trim(), description: description.trim() || null },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(cw.successToast);
      await refreshWorkspaces();

      if (data?.workspace?.id) {
        localStorage.setItem('tnexus_active_workspace', data.workspace.id);
      }

      navigate('/workspace/settings');
    } catch (err: any) {
      toast.error(err.message || cw.errorToast);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{cw.title}</CardTitle>
          <CardDescription>{cw.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">{cw.nameLabel}</Label>
              <Input
                id="ws-name"
                placeholder={cw.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc">{cw.descLabel}</Label>
              <Textarea
                id="ws-desc"
                placeholder={cw.descPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                {cw.cancelBtn}
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting || !name.trim()}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {cw.createBtn}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
