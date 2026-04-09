import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { locale } = useLanguage();

  const title = locale === 'vi' ? 'Từ chối truy cập' : 'Access Denied';
  const description = locale === 'vi'
    ? 'Bạn không phải thành viên của dự án này. Vui lòng liên hệ quản trị viên hoặc trưởng nhóm để được mời tham gia.'
    : 'You are not a member of this project. Please contact the administrator or project leader to get invited.';
  const backLabel = locale === 'vi' ? 'Về trang chủ' : 'Back to Home';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-6">
        <ShieldX className="h-16 w-16 text-destructive" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground text-base">{description}</p>
      </div>
      <Button variant="outline" onClick={() => navigate('/groups')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Button>
    </div>
  );
}
