import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Shield, CreditCard, ArrowLeft, ExternalLink } from 'lucide-react';
import tNexusLogo from '@/assets/t-nexus-logo.png';

export default function Guide() {
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const prefix = isVi ? '/vi' : '';

  const guides = [
    {
      title: isVi ? 'Điều khoản sử dụng' : 'Terms of Service',
      description: isVi
        ? 'Các điều khoản và điều kiện khi sử dụng nền tảng T-Nexus.'
        : 'Terms and conditions for using the T-Nexus platform.',
      href: `${prefix}/guide/terms`,
      icon: FileText,
    },
    {
      title: isVi ? 'Chính sách bảo mật' : 'Privacy Policy',
      description: isVi
        ? 'Cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.'
        : 'How we collect, use, and protect your personal information.',
      href: `${prefix}/guide/privacy`,
      icon: Shield,
    },
    {
      title: isVi ? 'Tài liệu định giá' : 'Pricing Documentation',
      description: isVi
        ? 'Chi tiết về các gói dịch vụ và tính năng đi kèm.'
        : 'Details about service plans and included features.',
      href: `${prefix}/guide/pricing`,
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={prefix || '/'} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {isVi ? 'Trang chủ' : 'Home'}
          </Link>
          <Link to={prefix || '/'} className="flex items-center gap-2">
            <img src={tNexusLogo} alt="T-Nexus" className="h-7 w-7" />
            <span className="font-semibold text-neutral-900">T-Nexus</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">
            {isVi ? 'Tài liệu & Chính sách' : 'Documentation & Policies'}
          </h1>
          <p className="text-neutral-500 text-lg">
            {isVi
              ? 'Tìm hiểu về các chính sách, điều khoản và tài liệu hướng dẫn của T-Nexus.'
              : 'Learn about T-Nexus policies, terms, and documentation.'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Link
                key={guide.href}
                to={guide.href}
                className="group flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-6 transition-all hover:border-neutral-400 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-neutral-100 p-2.5 text-neutral-600 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 mb-1">{guide.title}</h2>
                  <p className="text-sm text-neutral-500 leading-relaxed">{guide.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
