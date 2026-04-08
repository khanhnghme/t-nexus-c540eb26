import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Save, Eye, Loader2, Github, Linkedin, Facebook, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SocialLinks {
  github?: string;
  linkedin?: string;
  facebook?: string;
  website?: string;
  [key: string]: string | undefined;
}

export default function ProfileEditor() {
  const { profile, user } = useAuth();
  const { translations: { app: { utilities: t } } } = useLanguage();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, bio, skills, social_links')
        .eq('id', user.id)
        .single();
      if (data) {
        setUsername(data.username || '');
        setBio(data.bio || '');
        setSkills(data.skills || '');
        setSocialLinks((data.social_links as SocialLinks) || {});
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (username && !/^[a-z0-9\-]{3,30}$/.test(username)) {
      toast({ title: t.usernameInvalid, description: t.usernameInvalidDesc, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: username || null, bio, skills, social_links: socialLinks })
      .eq('id', user.id);
    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast({ title: t.usernameTaken, variant: 'destructive' });
      } else {
        toast({ title: t.error || 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: t.savedSuccess });
    }
    setSaving(false);
  };

  const updateSocialLink = (key: string, value: string) => {
    setSocialLinks(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.profileTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.profileDesc}</p>
        </div>
        {username && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/u/${username}`} target="_blank">
              <Eye className="w-4 h-4 mr-1.5" />{t.viewPage}
            </Link>
          </Button>
        )}
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username">{t.usernameLabel}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">/u/</span>
          <Input
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
            placeholder="khanhngh"
            maxLength={30}
          />
        </div>
        {username && (
          <p className="text-xs text-muted-foreground">
            URL: <span className="font-mono text-foreground">{window.location.origin}/u/{username}</span>
          </p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">{t.bioLabel}</Label>
        <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder={t.bioPlaceholder} rows={3} maxLength={500} />
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <Label htmlFor="skills">{t.skillsLabel}</Label>
        <Input id="skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder={t.skillsPlaceholder} />
        <p className="text-xs text-muted-foreground">{t.skillsSeparator}</p>
        {skills && (
          <div className="flex flex-wrap gap-1.5">
            {skills.split(',').map((s, i) => s.trim() && (
              <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <Label>{t.socialLinksLabel}</Label>
        <div className="grid gap-3">
          {[
            { key: 'github', icon: Github, placeholder: 'https://github.com/username' },
            { key: 'linkedin', icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
            { key: 'facebook', icon: Facebook, placeholder: 'https://facebook.com/username' },
            { key: 'website', icon: Globe, placeholder: 'https://yourwebsite.com' },
          ].map(({ key, icon: Icon, placeholder }) => (
            <div key={key} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                value={socialLinks[key] || ''}
                onChange={e => updateSocialLink(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        {t.saveChanges}
      </Button>
    </div>
  );
}
