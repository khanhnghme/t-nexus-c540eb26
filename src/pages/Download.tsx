import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, CheckCircle2, Share, Info } from 'lucide-react';
import tNexusText from '@/assets/t-nexus-text.png';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function DownloadPage() {
  const { translations: t, localizedPath: lp } = useLanguage();
  const td = t.download;

  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsInstalled(true);
      (window as any).__pwaInstallPrompt = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = (window as any).__pwaInstallPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        (window as any).__pwaInstallPrompt = null;
      }
    } else {
      // No native prompt available → show manual instructions
      setShowManual(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={lp('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{td.backHome}</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <img src={tNexusText} alt="T-Nexus" className="h-4 w-auto" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20 max-w-lg">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <img src={tNexusText} alt="T-Nexus" className="h-20 md:h-24 w-auto mx-auto mb-5" />
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            {td.subtitle}
          </p>
        </div>

        {/* Main install card */}
        <div className="rounded-xl border border-border bg-card p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          {isStandalone ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{td.alreadyRunning}</h2>
              <p className="text-sm text-muted-foreground">
                {td.alreadyRunningDesc}
              </p>
            </div>
          ) : isInstalled ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{td.installedSuccess}</h2>
              <p className="text-sm text-muted-foreground">
                {td.installedSuccessDesc}
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Download className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{td.installTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  {td.installDesc}
                </p>
              </div>

              {!showManual && (
                <Button onClick={handleInstall} size="lg" className="w-full gap-2 rounded-lg font-medium">
                  <Download className="w-4 h-4" /> {td.installNow}
                </Button>
              )}

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 justify-center">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {td.free}
                </Badge>
                <span>•</span>
                <span>{td.lightweight}</span>
              </div>

              {/* Manual instructions — only shown after clicking install when no native prompt */}
              {showManual && (
                <div className="mt-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-left space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                    <Info className="w-4 h-4 shrink-0" />
                    {td.manualTitle}
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    {td.manualDesc}
                  </p>
                  {isIOS ? (
                    <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>{td.iosStep1Share} <Share className="w-3 h-3 inline -mt-0.5" /> <strong>{td.iosStep1ShareBtn}</strong> {td.iosStep1End}</li>
                      <li>{td.iosStep2}</li>
                      <li>{td.iosStep3}</li>
                    </ol>
                  ) : (
                    <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>{td.androidStep1}</li>
                      <li>{td.androidStep2}</li>
                      <li>{td.androidStep3}</li>
                    </ol>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-14 text-xs text-muted-foreground/50 space-y-2">
          <p>{td.footer}</p>
          <LanguageToggle />
        </div>
      </main>
    </div>
  );
}
