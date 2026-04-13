import { useEffect, useState } from 'react';
import { TNexusLogo } from '@/components/TNexusLogo';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, CheckCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserProfile {
  full_name: string;
  student_id: string;
  avatar_url: string | null;
  institution: string | null;
}

function maskStudentId(id: string): string {
  if (id.length <= 5) return id.substring(0, 2) + '***';
  return id.substring(0, 3) + '***' + id.substring(id.length - 2);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [done, setDone] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    const hash = window.location.hash;
    const hasRecoveryHash = hash.includes('type=recovery') || hash.includes('type=signup');
    
    if (hasRecoveryHash) {
      setIsValid(true);
    }

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, student_id, avatar_url, institution')
        .eq('id', userId)
        .single();
      if (data && mounted) setProfile(data as UserProfile);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsValid(true);
        setSessionReady(true);
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') && session?.user?.id) {
        setSessionReady(true);
        fetchProfile(session.user.id);
      }
    });

    // Also try fetching immediately if session exists
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.id && mounted) {
        setSessionReady(true);
        fetchProfile(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Lỗi', description: 'Mật khẩu tối thiểu 6 ký tự.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Lỗi', description: 'Mật khẩu xác nhận không khớp.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    try {
      // Ensure session is ready before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Lỗi', description: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại từ email.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      
      // Save demo password via edge function
      if (session.user?.id) {
        supabase.functions.invoke('manage-users', {
          body: { action: 'save_demo_password', user_id: session.user.id, password },
        }).catch(err => console.warn('demo_passwords save failed:', err));
      }

      setDone(true);
      setIsLoading(false);
      toast({ title: 'Thành công', description: 'Mật khẩu đã được đặt lại.' });
      
      // Sign out after a small delay so state updates first
      setTimeout(async () => {
        await supabase.auth.signOut({ scope: 'local' });
      }, 500);
    } catch (err) {
      console.error('Reset password error:', err);
      toast({ title: 'Lỗi', description: 'Có lỗi xảy ra, vui lòng thử lại.', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  if (!isValid && !done) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Quay lại đăng nhập
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <TNexusLogo variant="text" width={160} />
          <span className="font-heading font-semibold text-primary text-sm">T-Nexus</span>
        </div>
        <Card className="w-full shadow-card-lg border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-heading">
              {done ? 'Đặt lại thành công' : 'Đặt lại mật khẩu'}
            </CardTitle>
            <CardDescription>
              {done ? 'Bạn có thể đăng nhập với mật khẩu mới' : 'Nhập mật khẩu mới cho tài khoản của bạn'}
            </CardDescription>
            {/* User identity hint */}
            {!done && profile && (
              <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-muted/60 border border-border/50">
                <Avatar className="h-10 w-10 shrink-0">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile.full_name}
                  </p>
                  {profile.institution && (
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.institution}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    MSSV: {maskStudentId(profile.student_id)}
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Mật khẩu đã được thay đổi thành công. Vui lòng đăng nhập lại với mật khẩu mới.
                </p>
                <Button className="w-full" onClick={() => { window.location.href = `${window.location.origin}/auth`; }}>
                  Đăng nhập ngay
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Mật khẩu mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Xác nhận mật khẩu mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Nhập lại mật khẩu"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full font-semibold" disabled={isLoading || !sessionReady}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {!sessionReady ? 'Đang xác thực...' : 'Đặt lại mật khẩu'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
