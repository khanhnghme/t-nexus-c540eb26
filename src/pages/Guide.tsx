import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import tNexusLogo from '@/assets/t-nexus-logo.png';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import { ArrowLeft } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';

export default function Guide() {
  const navigate = useNavigate();
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const prefix = isVi ? '/vi' : '';

  const sections = [
    {
      title: isVi ? 'Chính sách' : 'Policies',
      links: [
        { label: isVi ? 'Điều khoản sử dụng' : 'Terms of Service', href: `${prefix}/guide/terms` },
        { label: isVi ? 'Chính sách bảo mật' : 'Privacy Policy', href: `${prefix}/guide/privacy` },
      ],
    },
    {
      title: isVi ? 'Tài liệu' : 'Documentation',
      links: [
        { label: isVi ? 'Hướng dẫn định giá' : 'Pricing Documentation', href: `${prefix}/guide/pricing` },
      ],
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#37352f', fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #e8e5e0', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#37352f', fontSize: 14, fontWeight: 500, padding: 0 }}
          >
            <ArrowLeft size={16} />
            <span>{isVi ? 'Quay lại' : 'Back'}</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LanguageToggle />
            <Link to={prefix || '/'} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={tNexusLogo} alt="T-Nexus" style={{ height: 28, width: 28 }} />
              <img src={tNexusTextWhite} alt="T-Nexus" style={{ height: 14, filter: 'invert(1)' }} />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          {isVi ? 'Tài liệu & Chính sách' : 'Documentation & Policies'}
        </h1>
        <p style={{ fontSize: 15, color: '#787774', marginBottom: 40 }}>
          {isVi
            ? 'Tìm hiểu về các chính sách, điều khoản và tài liệu hướng dẫn của T-Nexus.'
            : 'Learn about T-Nexus policies, terms, and documentation.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {sections.map((section) => (
            <div key={section.title} style={{ borderTop: '1px solid #e8e5e0', padding: '28px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#37352f', margin: 0 }}>
                  {section.title}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 24px' }}>
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      style={{ fontSize: 14, color: '#37352f', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#2383e2')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#37352f')}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
