import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, LogIn, Loader2, Users } from 'lucide-react';
import { TNexusLogo } from '@/components/TNexusLogo';
import JoinByCodeDialog from '@/components/JoinByCodeDialog';
import { ForceLightMode } from '@/components/ForceLightMode';

export default function JoinProject() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const code = searchParams.get('code') || '';
  const [showDialog, setShowDialog] = useState(false);
  const autoOpenedRef = useRef(false);

  // If authenticated and code exists, auto-open join dialog
  useEffect(() => {
    if (!authLoading && user && code && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setShowDialog(true);
    }
  }, [authLoading, user, code]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authenticated: show dialog
  if (user) {
    return (
      <ForceLightMode>
        <div className="min-h-screen bg-muted/30 flex flex-col">
          <header className="bg-card border-b">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <TNexusLogo />
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Tham gia dự án</CardTitle>
                <CardDescription>
                  {code ? `Mã tham gia: ${code}` : 'Đang xử lý lời mời...'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!code && (
                  <p className="text-sm text-muted-foreground">
                    Link không hợp lệ. Vui lòng kiểm tra lại link mời hoặc nhập mã thủ công.
                  </p>
                )}
              </CardContent>
            </Card>
          </main>

          <JoinByCodeDialog
            open={showDialog}
            onOpenChange={(open) => {
              setShowDialog(open);
              if (!open) navigate('/dashboard');
            }}
            onJoined={() => navigate('/dashboard')}
            initialCode={code}
          />
        </div>
      </ForceLightMode>
    );
  }

  // Not authenticated: show login prompt
  const redirectUrl = `/join${code ? `?code=${code}` : ''}`;

  const handleLogin = () => {
    sessionStorage.setItem('t-nexus_post_login_redirect', redirectUrl);
    navigate('/auth');
  };

  return (
    <ForceLightMode>
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <header className="bg-card border-b">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Trang chủ
              </Button>
            </Link>
            <TNexusLogo />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Bạn được mời tham gia dự án</CardTitle>
              <CardDescription>
                Bạn cần đăng nhập tài khoản T-Nexus để chấp nhận lời mời tham gia dự án.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {code && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Mã tham gia</p>
                  <p className="text-xl font-mono font-bold tracking-widest">{code}</p>
                </div>
              )}
              <Button onClick={handleLogin} className="w-full" size="lg">
                <LogIn className="w-4 h-4 mr-2" />
                Đăng nhập để tham gia
              </Button>
              <p className="text-xs text-muted-foreground">
                Chưa có tài khoản? Bạn có thể đăng ký ngay sau khi nhấn đăng nhập.
              </p>
            </CardContent>
          </Card>
        </main>

        <footer className="border-t py-4 text-center text-sm text-muted-foreground bg-card">
          Powered by T-Nexus
        </footer>
      </div>
    </ForceLightMode>
  );
}
