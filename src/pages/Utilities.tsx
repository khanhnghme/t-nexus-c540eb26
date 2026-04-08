import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { User, Trophy, Wrench } from 'lucide-react';
import ProfileEditor from '@/components/utilities/ProfileEditor';
import ProfileAchievements from '@/components/utilities/ProfileAchievements';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export default function Utilities() {
  const { isAdmin } = useAuth();
  const { translations: { app: { utilities: t } } } = useLanguage();
  const [activeTab, setActiveTab] = useState('profile');

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const sidebarItems: SidebarItem[] = [
    { id: 'profile', label: t.tabProfile, icon: User, description: t.tabProfileDesc },
    { id: 'achievements', label: t.tabAchievements, icon: Trophy, description: t.tabAchievementsDesc },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileEditor />;
      case 'achievements': return <ProfileAchievements />;
      default: return <ProfileEditor />;
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6" />
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1">
              {sidebarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full',
                    activeTab === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate">{item.label}</div>
                    <div className={cn(
                      'text-xs truncate hidden md:block',
                      activeTab === item.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>{item.description}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}
