import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { TNexusLogo } from '@/components/TNexusLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Users, ArrowLeft } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';

export default function PasswordSuccess() {
  const navigate = useNavigate();
  const { translations, localizedPath: lp } = useLanguage();
  const ta = translations.auth;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={lp('/')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {ta.backHome}
            </Button>
          </Link>
          <span className="hidden sm:inline font-heading text-sm text-muted-foreground">T-Nexus</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 gap-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-2">
            <TNexusLogo variant="text" width={120} />
            <span className="font-heading font-semibold text-primary flex items-center gap-1">
              <Users className="w-4 h-4" /> {ta.memberBrand}
            </span>
          </div>
          <Card className="w-full shadow-card-lg border-border/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-heading font-semibold text-emerald-700 dark:text-emerald-400">{ta.forgotResetSuccess}</h3>
                <p className="text-sm text-muted-foreground">{ta.forgotResetSuccessDesc}</p>
                <Button className="w-full" onClick={() => navigate('/login')}>
                  {ta.forgotLoginNow}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground bg-card">
        <div className="flex items-center justify-center gap-4">
          <span>{ta.footerCopyright}</span>
          <LanguageToggle />
        </div>
      </footer>
    </div>
  );
}
