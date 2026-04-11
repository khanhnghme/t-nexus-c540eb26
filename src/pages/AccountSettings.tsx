import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Locale } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  CalendarDays, MessageSquare, BookOpen, Lightbulb,
  Eye, EyeOff, Navigation,
  Globe, Check, Loader2, Link2,
} from 'lucide-react';
import ConnectedServicesCard from '@/components/settings/ConnectedServicesCard';

const TOGGLEABLE_PAGES = [
  { href: '/calendar', name: 'Calendar', nameVi: 'Lịch', icon: CalendarDays, description: 'Task calendar overview', descVi: 'Lịch tổng hợp công việc' },
  { href: '/communication', name: 'Communication', nameVi: 'Trao đổi', icon: MessageSquare, description: 'Messages & discussions', descVi: 'Tin nhắn & thảo luận' },
  { href: '/tips', name: 'Tips', nameVi: 'Mẹo', icon: BookOpen, description: 'System usage guides', descVi: 'Hướng dẫn sử dụng hệ thống' },
  { href: '/feedback', name: 'Feedback', nameVi: 'Góp ý', icon: Lightbulb, description: 'Send feedback', descVi: 'Gửi ý kiến phản hồi' },
];

function NavCustomizationSection({ userId, locale }: { userId?: string; locale: Locale }) {
  const { profile, refreshProfile } = useAuth();
  const [hiddenPages, setHiddenPages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const isVi = locale === 'vi';

  useEffect(() => {
    if (profile) {
      const nav = profile.nav_hidden_pages;
      setHiddenPages(Array.isArray(nav) ? (nav as string[]) : []);
    }
  }, [profile]);

  const togglePage = async (href: string) => {
    if (!userId) return;
    const updated = hiddenPages.includes(href)
      ? hiddenPages.filter(h => h !== href)
      : [...hiddenPages, href];
    setHiddenPages(updated);
    setSaving(true);
    await supabase.from('profiles').update({ nav_hidden_pages: updated as any }).eq('id', userId);
    await refreshProfile();
    setSaving(false);
    window.dispatchEvent(new Event('nav-visibility-changed'));
  };

  return (
    <div className="space-y-3">
      {TOGGLEABLE_PAGES.map((page) => {
        const PageIcon = page.icon;
        const isVisible = !hiddenPages.includes(page.href);
        return (
          <div
            key={page.href}
            className="flex items-center gap-3 py-2"
          >
            <div className={`p-1.5 rounded-md ${isVisible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <PageIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none">{isVi ? page.nameVi : page.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isVi ? page.descVi : page.description}</p>
            </div>
            <Switch checked={isVisible} onCheckedChange={() => togglePage(page.href)} />
          </div>
        );
      })}
      {hiddenPages.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
          <EyeOff className="w-3 h-3" />
          {isVi
            ? `Đang ẩn ${hiddenPages.length} trang`
            : `${hiddenPages.length} page(s) hidden`}
        </p>
      )}
    </div>
  );
}

function LanguageSection({ locale, setLocale: setLocaleFn }: { locale: Locale; setLocale: (l: Locale) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isVi = locale === 'vi';

  const handleChange = async (newLocale: Locale) => {
    if (newLocale === locale || saving) return;
    setSaving(true);
    try {
      await setLocaleFn(newLocale);
      toast({ title: newLocale === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English' });
    } catch {
      toast({ title: isVi ? 'Lỗi' : 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const options: { value: Locale; label: string; flag: string }[] = [
    { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const isActive = locale === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all text-sm font-medium ${
              isActive
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
            }`}
          >
            <span className="text-lg">{opt.flag}</span>
            {opt.label}
            {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
            {saving && !isActive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          </button>
        );
      })}
    </div>
  );
}

export default function AccountSettings() {
  const { user } = useAuth();
  const { locale, setLocale } = useLanguage();
  const isVi = locale === 'vi';

  return (
    <div className="max-w-3xl mx-auto py-2 px-1 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-heading font-bold tracking-tight">
          {isVi ? 'Cài đặt' : 'Settings'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isVi ? 'Tùy chỉnh giao diện và dịch vụ liên kết' : 'Customize interface & connected services'}
        </p>
      </div>

      {/* All settings in one card */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {/* Language */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{isVi ? 'Ngôn ngữ' : 'Language'}</h3>
            </div>
            <LanguageSection locale={locale} setLocale={setLocale} />
          </div>

          {/* Connected Services */}
          <div className="p-5" id="integrations">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{isVi ? 'Dịch vụ liên kết' : 'Connected Services'}</h3>
            </div>
            <ConnectedServicesCard />
          </div>

          {/* Navigation */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{isVi ? 'Thanh điều hướng' : 'Navigation'}</h3>
            </div>
            <NavCustomizationSection userId={user?.id} locale={locale} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
