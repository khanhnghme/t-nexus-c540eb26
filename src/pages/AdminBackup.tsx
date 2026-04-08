import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminBackupRestore from '@/components/AdminBackupRestore';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, Upload, FolderArchive, Settings, File, MessageSquare, 
  FileText, MessageCircle, FolderOpen, History, Award, Bug, 
  HelpCircle, Shield, AlertTriangle, CheckCircle, Database,
  Clock, Zap, Lock
} from 'lucide-react';

export default function AdminBackup() {
  const { isAdmin } = useAuth();
  const { translations: { app: { admin: t } } } = useLanguage();

  if (!isAdmin) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t.noAccessDesc}</p>
        </div>
      </>
    );
  }

  const backupFeatures = [
    { icon: Settings, label: t.backupFeatureProjectInfo },
    { icon: File, label: t.backupFeatureFiles },
    { icon: MessageSquare, label: t.backupFeatureMessages },
    { icon: FileText, label: t.backupFeatureTaskNotes },
    { icon: MessageCircle, label: t.backupFeatureTaskComments },
    { icon: FolderOpen, label: t.backupFeatureResources },
    { icon: History, label: t.backupFeatureActivityLog },
    { icon: Award, label: t.backupFeatureScores },
    { icon: Bug, label: t.backupFeatureAdjustments },
    { icon: HelpCircle, label: t.backupFeatureFeedback },
    { icon: Shield, label: t.backupFeatureIntegrity },
    { icon: FolderArchive, label: t.backupFeatureFolders },
  ];

  const backupSteps = [t.backupStep1, t.backupStep2, t.backupStep3, t.backupStep4, t.backupStep5];
  const restoreSteps = [t.restoreStep1, t.restoreStep2, t.restoreStep3, t.restoreStep4, t.restoreStep5];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {t.backupTitle}
            <span className="text-xs font-normal text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full">v6.0</span>
          </h1>
          <p className="text-muted-foreground">{t.backupDesc}</p>
        </div>

        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 overflow-hidden relative">
          <CardContent className="pt-6 pb-6 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                <FolderArchive className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t.startBackupRestore}</h2>
                <p className="text-sm text-muted-foreground">{t.startBackupDesc}</p>
              </div>
            </div>
            <AdminBackupRestore />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{t.backupProject}</h3>
                  <p className="text-xs text-muted-foreground">{t.backupProjectDesc}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-2 text-foreground">{t.backupContents}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {backupFeatures.map(({ icon: Icon, label }, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-emerald-500" /> {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{t.restoreProject}</h3>
                  <p className="text-xs text-muted-foreground">{t.restoreProjectDesc}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-medium mb-2">{t.restoreWarning}</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{t.restoreNote1}</li>
                    <li>{t.restoreNote2}</li>
                    <li>{t.restoreNote3}</li>
                    <li>{t.restoreNote4}</li>
                    <li>{t.restoreNote5}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Database className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">{t.comprehensiveBackup}</h4>
                <p className="text-xs text-muted-foreground">{t.comprehensiveBackupDesc}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">{t.integrityCheck}</h4>
                <p className="text-xs text-muted-foreground">{t.integrityCheckDesc}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">{t.realtimeTracking}</h4>
                <p className="text-xs text-muted-foreground">{t.realtimeTrackingDesc}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {t.howItWorks}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-500" /> {t.backupFlow}
                </p>
                <div className="space-y-2 pl-6 border-l-2 border-emerald-500/20">
                  {backupSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs flex items-center justify-center flex-shrink-0 font-semibold mt-0.5">{i + 1}</span>
                      <span className="text-xs text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-500" /> {t.restoreFlow}
                </p>
                <div className="space-y-2 pl-6 border-l-2 border-amber-500/20">
                  {restoreSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 text-xs flex items-center justify-center flex-shrink-0 font-semibold mt-0.5">{i + 1}</span>
                      <span className="text-xs text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">{t.securityPrivacy}</h4>
              <p className="text-xs text-muted-foreground">{t.securityDesc}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}