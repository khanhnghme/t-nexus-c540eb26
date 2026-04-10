import { useEffect, useState, useRef } from 'react';

import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import UserAvatar from '@/components/UserAvatar';
import { toast } from '@/hooks/use-toast';
import {
  Github, Linkedin, Facebook, Globe, Mail, GraduationCap, BookOpen, Calendar,
  ArrowLeft, Loader2, FolderKanban, ExternalLink, Trophy, Video, VideoOff, Share2, Sparkles
} from 'lucide-react';

interface SocialLinks {
  github?: string;
  linkedin?: string;
  facebook?: string;
  website?: string;
  [key: string]: string | undefined;
}

interface ProfileData {
  id: string;
  full_name: string;
  student_id: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  skills: string | null;
  major: string | null;
  year_batch: string | null;
  institution: string | null;
  social_links: SocialLinks;
}

interface Achievement {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  link_url: string | null;
  category: string;
}

interface PublicGroup {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
}

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github, linkedin: Linkedin, facebook: Facebook, website: Globe,
};
const socialLabels: Record<string, string> = {
  github: 'GitHub', linkedin: 'LinkedIn', facebook: 'Facebook', website: 'Website',
};
const categoryLabels: Record<string, string> = {
  academic: 'Học tập', activity: 'Hoạt động', skill: 'Kỹ năng & Chứng chỉ', award: 'Giải thưởng', general: 'Khác',
};
const categoryEmoji: Record<string, string> = {
  academic: '📚', activity: '🎯', skill: '🏅', award: '🏆', general: '📌',
};

// Hook for intersection observer animation
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideo, setShowVideo] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      const { data } = await supabase
        .from('system_settings').select('value').eq('key', 'dashboard_video_bg').maybeSingle();
      if (data?.value) {
        const val = data.value as { enabled?: boolean; url?: string };
        setVideoEnabled(val.enabled ?? false);
        setVideoUrl(val.url ?? '');
      }
    };
    fetchVideo();
  }, []);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, student_id, email, avatar_url, bio, skills, major, year_batch, institution, social_links')
        .eq('username', username).single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setProfile({ ...data, social_links: (data.social_links as SocialLinks) || {} });

      const [achievementsRes, membersRes] = await Promise.all([
        supabase.from('profile_achievements').select('id, title, description, image_path, link_url, category')
          .eq('user_id', data.id).order('display_order'),
        supabase.from('group_members').select('group_id, groups!inner(id, name, slug, description, is_public)')
          .eq('user_id', data.id),
      ]);
      setAchievements((achievementsRes.data as Achievement[]) || []);
      if (membersRes.data) {
        setGroups(membersRes.data.filter((m: any) => m.groups?.is_public).map((m: any) => m.groups as PublicGroup));
      }
      setLoading(false);
      setTimeout(() => setHeroLoaded(true), 100);
    };
    load();
  }, [username]);

  const getImageUrl = (path: string) => r2Storage.from('profile-achievements').getPublicUrl(path).data?.publicUrl || '';

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Đã sao chép liên kết!' });
  };

  if (loading) return null;

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center animate-scale-in-bounce">
          <GraduationCap className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold animate-fade-in-up" style={{ animationDelay: '150ms' }}>Không tìm thấy trang cá nhân</h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          Username "<span className="font-mono text-foreground">{username}</span>" không tồn tại.
        </p>
        <Button variant="outline" className="animate-fade-in-up" style={{ animationDelay: '350ms' }} asChild>
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Về trang chủ</Link>
        </Button>
      </div>
    );
  }

  const activeSocialLinks = Object.entries(profile.social_links).filter(([_, v]) => v && v.trim());
  const skillList = profile.skills?.split(',').map(s => s.trim()).filter(Boolean) || [];
  const achievementGroups = Object.entries(categoryLabels)
    .map(([value, label]) => ({ value, label, items: achievements.filter(a => a.category === value) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Video Background */}
      {videoEnabled && videoUrl && showVideo && (
        <>
          <video
            autoPlay loop muted playsInline
            className="fixed inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: 0.12, zIndex: 0, transition: 'opacity 1.5s ease' }}
            src={videoUrl}
          />
          <div className="fixed inset-0 bg-background/75 pointer-events-none" style={{ zIndex: 1 }} />
        </>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{ zIndex: 2 }}>
        <div className="h-60 md:h-80 relative">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-accent/60" />
          
          {/* Floating decorative shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-72 h-72 -top-20 -right-20 rounded-full bg-white/5 animate-float" />
            <div className="absolute w-48 h-48 top-10 left-10 rounded-full bg-white/[0.03] animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute w-32 h-32 bottom-0 right-1/3 rounded-full bg-white/[0.04] animate-float" style={{ animationDelay: '2s' }} />
          </div>
          
          {/* Dot pattern overlay */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
          
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />

          {/* Top bar with glass effect */}
          <div className={`absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10 transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full px-4" asChild>
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-1.5" />Trang chủ</Link>
            </Button>
            <div className="flex items-center gap-1.5">
              {videoEnabled && videoUrl && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full h-9 w-9"
                        onClick={() => setShowVideo(!showVideo)}
                      >
                        {showVideo ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{showVideo ? 'Tắt video nền' : 'Bật video nền'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full h-9 w-9"
                      onClick={handleShare}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sao chép liên kết</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-28 relative pb-16" style={{ zIndex: 3 }}>
        {/* Profile Header Card */}
        <div className={`transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-md overflow-hidden">
            {/* Subtle top accent line */}
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar with animation */}
                <div className="shrink-0 flex flex-col items-center md:items-start">
                  <div className={`relative transition-all duration-500 delay-300 ${heroLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                    <div className="absolute -inset-2 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-lg opacity-60" />
                    <UserAvatar
                      src={profile.avatar_url}
                      name={profile.full_name}
                      size="xl"
                      className="w-32 h-32 border-4 border-background shadow-2xl text-3xl relative"
                    />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-card shadow-lg animate-scale-in-bounce" style={{ animationDelay: '600ms' }} />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <div className={`transition-all duration-500 delay-400 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight">{profile.full_name}</h1>
                    <p className="text-muted-foreground font-medium mt-0.5 font-mono text-sm">@{username}</p>
                  </div>

                  {profile.bio && (
                    <div className={`transition-all duration-500 delay-500 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                      <p className="text-foreground/80 leading-relaxed mt-3 max-w-xl">{profile.bio}</p>
                    </div>
                  )}

                  {/* Quick Info Pills */}
                  <div className={`flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4 transition-all duration-500 delay-[600ms] ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {profile.student_id && (
                      <div className="flex items-center gap-1.5 text-xs bg-muted/80 rounded-full px-3 py-1.5 text-muted-foreground">
                        <GraduationCap className="w-3.5 h-3.5" />{profile.student_id}{profile.institution ? ` • ${profile.institution}` : ''}
                      </div>
                    )}
                    {profile.major && (
                      <div className="flex items-center gap-1.5 text-xs bg-muted/80 rounded-full px-3 py-1.5 text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5" />{profile.major}
                      </div>
                    )}
                    {profile.year_batch && (
                      <div className="flex items-center gap-1.5 text-xs bg-muted/80 rounded-full px-3 py-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />Khóa {profile.year_batch}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs bg-muted/80 rounded-full px-3 py-1.5 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />{profile.email}
                    </div>
                  </div>

                  {/* Social Links */}
                  {activeSocialLinks.length > 0 && (
                    <div className={`flex items-center justify-center md:justify-start gap-2.5 mt-5 transition-all duration-500 delay-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                      {activeSocialLinks.map(([key, url], i) => {
                        const Icon = socialIcons[key] || Globe;
                        return (
                          <TooltipProvider key={key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-10 h-10 rounded-xl bg-muted/80 hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-0.5"
                                  style={{ animationDelay: `${700 + i * 80}ms` }}
                                >
                                  <Icon className="w-[18px] h-[18px]" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>{socialLabels[key] || key}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Skills */}
            {skillList.length > 0 && (
              <AnimatedSection delay={100}>
                <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="pt-5 pb-5">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />Kỹ năng
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {skillList.map((skill, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="px-2.5 py-1 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors duration-200 cursor-default"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            )}

            {/* Public Groups */}
            {groups.length > 0 && (
              <AnimatedSection delay={200}>
                <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="pt-5 pb-5">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-primary" />Dự án
                    </h3>
                    <div className="space-y-2">
                      {groups.map((g, i) => (
                        <div
                          key={g.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/60 transition-all duration-200 hover:translate-x-1 group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                            <FolderKanban className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{g.name}</p>
                            {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            )}
          </div>

          {/* Right Column: Achievements */}
          <div className="md:col-span-2">
            <AnimatedSection delay={150}>
              {achievementGroups.length > 0 ? (
                <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="pt-5 pb-5">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />Thành tích & Chứng chỉ
                      <Badge variant="outline" className="ml-auto text-xs">{achievements.length}</Badge>
                    </h3>
                    <div className="space-y-8">
                      {achievementGroups.map((group, gi) => (
                        <AnimatedSection key={group.value} delay={200 + gi * 100}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">{categoryEmoji[group.value]}</span>
                            <h4 className="text-sm font-semibold">{group.label}</h4>
                            <div className="flex-1 h-px bg-border ml-2" />
                            <Badge variant="secondary" className="text-xs">{group.items.length}</Badge>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {group.items.map((a, ai) => (
                              <div
                                key={a.id}
                                className="group rounded-xl border bg-card hover:shadow-lg transition-all duration-300 overflow-hidden hover:-translate-y-1"
                                style={{ animationDelay: `${ai * 80}ms` }}
                              >
                                {a.image_path && (
                                  <div
                                    className="h-40 bg-muted overflow-hidden cursor-pointer relative"
                                    onClick={() => setSelectedImage(getImageUrl(a.image_path!))}
                                  >
                                    <img
                                      src={getImageUrl(a.image_path)}
                                      alt={a.title}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-lg">
                                        <ExternalLink className="w-4 h-4 text-foreground" />
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className="p-4">
                                  <h5 className="font-semibold text-sm leading-snug">{a.title}</h5>
                                  {a.description && (
                                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{a.description}</p>
                                  )}
                                  {a.link_url && (
                                    <a
                                      href={a.link_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 mt-2.5 font-semibold group/link"
                                    >
                                      <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />Xem chi tiết
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AnimatedSection>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="py-20 text-center">
                    <div className="animate-float">
                      <Trophy className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                    </div>
                    <p className="text-muted-foreground font-medium">Chưa có thành tích nào được chia sẻ</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Hãy quay lại sau nhé!</p>
                  </CardContent>
                </Card>
              )}
            </AnimatedSection>
          </div>
        </div>

        {/* Footer */}
        <AnimatedSection delay={400}>
          <div className="text-center mt-12 text-xs text-muted-foreground/50">
            <p>Trang cá nhân của <span className="font-medium text-muted-foreground">{profile.full_name}</span></p>
          </div>
        </AnimatedSection>
      </div>

      {/* Image Lightbox with animation */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
          style={{ zIndex: 100 }}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Achievement"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-lightbox-in"
            onClick={e => e.stopPropagation()}
          />
          <Button
            variant="ghost" size="icon"
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}
