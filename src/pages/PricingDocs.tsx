import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { TNexusLogo } from '@/components/TNexusLogo';
import LanguageToggle from '@/components/LanguageToggle';
import {
  ArrowLeft, Users, CreditCard, Database, Package, HelpCircle,
  Lightbulb, ArrowRight, Lock, Clock, AlertTriangle, BookOpen,
  Check, X, Menu, ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  TOC definition                                                     */
/* ------------------------------------------------------------------ */

interface TocEntry {
  id: string;
  labelKey: string;
  level: 1 | 2;
  chapter?: number;
}

const TOC_ENTRIES: TocEntry[] = [
  { id: 'chapter-1', labelKey: 'ch1Label', level: 1, chapter: 1 },
  { id: 'owner-billing', labelKey: 's1', level: 2 },
  { id: 'unique-seat', labelKey: 's2', level: 2 },
  { id: 'resource-pool', labelKey: 's3', level: 2 },
  { id: 'addons', labelKey: 's4', level: 2 },
  { id: 'examples', labelKey: 's5', level: 2 },
  { id: 'faq', labelKey: 's6', level: 2 },
  { id: 'chapter-2', labelKey: 'ch2Label', level: 1, chapter: 2 },
  { id: 'read-only', labelKey: 'ch2s1', level: 2 },
  { id: 'grace-period', labelKey: 'ch2s2', level: 2 },
  { id: 'hard-delete', labelKey: 'ch2s3', level: 2 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PricingDocs() {
  const { translations: t, localizedPath: lp } = useLanguage();
  const navigate = useNavigate();
  const d = t.pricingDocs;

  const [activeId, setActiveId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
      setSidebarOpen(false);
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ Header ═══ */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e8e5e0', padding: '0 24px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="pricing-docs-mobile-toggle"
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#37352f' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#37352f', fontSize: 14, fontWeight: 500, padding: 0 }}
          >
            <ArrowLeft size={16} />
            <span>{d.backToPricing}</span>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageToggle />
          <TNexusLogo variant="text" width={80} />
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* ═══ Sidebar ═══ */}
        <aside
          className={`pricing-docs-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: 280, minWidth: 280, position: 'sticky', top: 56,
            height: 'calc(100vh - 56px)', overflowY: 'auto',
            borderRight: '1px solid #e8e5e0', background: '#ffffff',
            padding: '24px 0', flexShrink: 0,
          }}
        >
          <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #f0ede8', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#37352f', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              <BookOpen size={16} style={{ color: '#2383e2' }} />
              {d.tocTitle}
            </div>
            <div style={{ fontSize: 12, color: '#9b9a97' }}>{d.subtitle?.slice(0, 60)}…</div>
          </div>

          <nav style={{ padding: '0 8px' }}>
            {TOC_ENTRIES.map((entry) => {
              const label = entry.level === 1
                ? (d[entry.labelKey] || entry.labelKey)
                : (d.tocItems?.[entry.labelKey] || entry.labelKey);
              return (
                <button
                  key={entry.id}
                  onClick={() => scrollTo(entry.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    border: 'none',
                    background: activeId === entry.id ? 'rgba(35,131,226,0.06)' : 'transparent',
                    color: activeId === entry.id ? '#2383e2' : '#37352f',
                    fontWeight: activeId === entry.id ? 600 : entry.level === 1 ? 600 : 400,
                    fontSize: 13, textAlign: 'left',
                    padding: entry.level === 2 ? '6px 12px 6px 32px' : '8px 12px',
                    borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => { if (activeId !== entry.id) e.currentTarget.style.background = 'rgba(55,53,47,0.04)'; }}
                  onMouseLeave={(e) => { if (activeId !== entry.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  {entry.level === 1 && <ChevronRight size={12} style={{ color: activeId === entry.id ? '#2383e2' : '#c4c3bf', flexShrink: 0 }} />}
                  <span style={{ lineHeight: 1.4 }}>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="pricing-docs-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, top: 56, background: 'rgba(0,0,0,0.3)', zIndex: 39 }}
          />
        )}

        {/* ═══ Main content ═══ */}
        <main style={{ flex: 1, minWidth: 0, padding: '40px 48px 80px', maxWidth: 860 }}>
          {/* Title */}
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px', color: '#37352f', letterSpacing: '-0.02em' }}>
            {d.title}
          </h1>
          <p style={{ fontSize: 15, color: '#6b6b6b', marginBottom: 40, lineHeight: 1.7 }}>{d.subtitle}</p>

          {/* ═══════════ CHAPTER 1 ═══════════ */}
          <ChapterHeading id="chapter-1" title={d.ch1Label} />

          <DocSection icon={CreditCard} title={d.s1Title} id="owner-billing">
            <p className="pdoc-p">{d.s1Desc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {d.s1Steps.map((step: { title: string; desc: string }, i: number) => (
                <div key={i} style={{ border: '1px solid #e8e5e0', borderRadius: 8, padding: 16, background: '#f7f6f3' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(35,131,226,0.1)', color: '#2383e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{i + 1}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#37352f', marginBottom: 4 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              ))}
            </div>
            <DocCallout>{d.s1Callout}</DocCallout>
          </DocSection>

          <DocSection icon={Users} title={d.s2Title} id="unique-seat">
            <p className="pdoc-p">{d.s2Desc}</p>
            <DocTable headers={d.s2TableHeaders} rows={d.s2TableRows} />
            <DocCallout>{d.s2Callout}</DocCallout>
          </DocSection>

          <DocSection icon={Database} title={d.s3Title} id="resource-pool">
            <p className="pdoc-p">{d.s3Desc}</p>
            <DocTable headers={d.s3TableHeaders} rows={d.s3TableRows} highlightFirst />
            <DocCallout>{d.s3Callout}</DocCallout>
          </DocSection>

          <DocSection icon={Package} title={d.s4Title} id="addons">
            <p className="pdoc-p">{d.s4Desc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {d.s4Items.map((item: { name: string; price: string; note: string }, i: number) => (
                <div key={i} style={{ border: '1px solid #e8e5e0', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#37352f', marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#2383e2', marginBottom: 6 }}>{item.price}</div>
                  <div style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.5 }}>{item.note}</div>
                </div>
              ))}
            </div>
            <DocCallout>{d.s4Callout}</DocCallout>
          </DocSection>

          <DocSection icon={Lightbulb} title={d.s5Title} id="examples">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {d.s5Scenarios.map((sc: { title: string; desc: string; details: string[] }, i: number) => (
                <div key={i} style={{ border: '1px solid #e8e5e0', borderRadius: 8, padding: 20, background: '#f7f6f3' }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#37352f', marginBottom: 6 }}>{sc.title}</div>
                  <div style={{ fontSize: 14, color: '#6b6b6b', marginBottom: 10 }}>{sc.desc}</div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {sc.details.map((detail: string, j: number) => (
                      <li key={j} style={{ fontSize: 14, color: '#37352f', marginBottom: 4 }}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection icon={HelpCircle} title={d.s6Title} id="faq">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.s6Items.map((item: { q: string; a: string }, i: number) => (
                <div key={i} style={{ border: '1px solid #e8e5e0', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#37352f', marginBottom: 6 }}>{item.q}</div>
                  <div style={{ fontSize: 14, color: '#6b6b6b', lineHeight: 1.6 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </DocSection>

          {/* ═══════════ CHAPTER 2 ═══════════ */}
          <div style={{ borderTop: '1px solid #e8e5e0', marginTop: 40, paddingTop: 32 }}>
            <ChapterHeading id="chapter-2" title={d.ch2Label} variant="destructive" />
            <p className="pdoc-p">{d.ch2Subtitle}</p>
          </div>

          <DocSection icon={Lock} title={d.ch2s1Title} id="read-only">
            <p className="pdoc-p">{d.ch2s1Desc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ border: '1px solid #e8e5e0', borderRadius: 8, padding: 16, background: '#f7f6f3' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#37352f', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={15} style={{ color: '#2383e2' }} />
                  {t.language === 'vi' ? 'Được phép' : 'Allowed'}
                </div>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {d.ch2s1Allowed.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: '#37352f', marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <Check size={13} style={{ color: '#2383e2', flexShrink: 0, marginTop: 2 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ border: '1px solid rgba(235,87,87,0.3)', borderRadius: 8, padding: 16, background: 'rgba(235,87,87,0.04)' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#37352f', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <X size={15} style={{ color: '#eb5757' }} />
                  {t.language === 'vi' ? 'Bị cấm' : 'Blocked'}
                </div>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {d.ch2s1Blocked.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: '#37352f', marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <X size={13} style={{ color: '#eb5757', flexShrink: 0, marginTop: 2 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <DocCallout>{d.ch2s1Callout}</DocCallout>
          </DocSection>

          <DocSection icon={Clock} title={d.ch2s2Title} id="grace-period">
            <p className="pdoc-p">{d.ch2s2Desc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {d.ch2s2Options.map((opt: { title: string; desc: string; icon: string }, i: number) => (
                <div key={i} style={{
                  border: opt.icon === 'upgrade' ? '1px solid rgba(35,131,226,0.3)' : '1px solid #e8e5e0',
                  borderRadius: 8, padding: 16,
                  background: opt.icon === 'upgrade' ? 'rgba(35,131,226,0.04)' : '#f7f6f3',
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: opt.icon === 'upgrade' ? 'rgba(35,131,226,0.1)' : '#e8e5e0', color: opt.icon === 'upgrade' ? '#2383e2' : '#6b6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{i === 0 ? 'A' : 'B'}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#37352f', marginBottom: 6 }}>{opt.title}</div>
                  <div style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.5 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
            <DocCallout>{d.ch2s2Callout}</DocCallout>
          </DocSection>

          <DocSection icon={AlertTriangle} title={d.ch2s3Title} id="hard-delete">
            <p className="pdoc-p">{d.ch2s3Desc}</p>
            <ul style={{ margin: '0 0 16px', paddingLeft: 0, listStyle: 'none' }}>
              {d.ch2s3Actions.map((action: string, i: number) => (
                <li key={i} style={{ fontSize: 14, color: '#37352f', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertTriangle size={14} style={{ color: '#eb5757', flexShrink: 0, marginTop: 3 }} />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
            <div style={{ border: '1px solid #e8e5e0', borderRadius: 8, padding: 16, background: '#f7f6f3', marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#37352f', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>{d.ch2s3Rule}</p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              border: '1px solid rgba(235,87,87,0.3)', borderRadius: 8, padding: 14,
              background: 'rgba(235,87,87,0.04)',
            }}>
              <AlertTriangle size={16} style={{ color: '#eb5757', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#37352f', lineHeight: 1.6, margin: 0 }}>{d.ch2s3Callout}</p>
            </div>
          </DocSection>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 40 }}>
            <p style={{ fontSize: 15, color: '#6b6b6b', marginBottom: 16 }}>{d.ch2CtaText || d.ctaText}</p>
            <Link
              to={lp('/pricing')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 8,
                background: '#2383e2', color: '#fff', fontWeight: 500, fontSize: 14,
                textDecoration: 'none',
              }}
            >
              {d.ch2CtaButton || d.ctaButton}
              <ArrowRight size={16} />
            </Link>
          </div>
        </main>
      </div>

      {/* ═══ Styles ═══ */}
      <style>{`
        .pdoc-p {
          font-size: 15px;
          color: #37352f;
          line-height: 1.7;
          margin: 0 0 16px;
        }
        @media (max-width: 860px) {
          .pricing-docs-mobile-toggle {
            display: flex !important;
          }
          .pricing-docs-sidebar {
            position: fixed !important;
            left: -300px;
            top: 56px !important;
            height: calc(100vh - 56px) !important;
            z-index: 40;
            transition: left 0.25s ease;
            box-shadow: none;
          }
          .pricing-docs-sidebar.open {
            left: 0;
            box-shadow: 4px 0 24px rgba(0,0,0,0.1);
          }
          main { padding: 24px 20px 60px !important; }
        }
        .pricing-docs-sidebar::-webkit-scrollbar { width: 4px; }
        .pricing-docs-sidebar::-webkit-scrollbar-track { background: transparent; }
        .pricing-docs-sidebar::-webkit-scrollbar-thumb { background: #d3d1cb; border-radius: 4px; }
      `}</style>
    </div>
  );
}

/* ═══════════════ Sub-components ═══════════════ */

function ChapterHeading({ id, title, variant }: { id: string; title: string; variant?: 'destructive' }) {
  const color = variant === 'destructive' ? '#eb5757' : '#2383e2';
  return (
    <h2 id={id} style={{ fontSize: 22, fontWeight: 700, color: '#37352f', margin: '0 0 16px', paddingBottom: 8, borderBottom: `2px solid ${color}`, scrollMarginTop: 90, display: 'flex', alignItems: 'center', gap: 8 }}>
      <BookOpen size={18} style={{ color }} />
      {title}
    </h2>
  );
}

function DocSection({ icon: Icon, title, id, children }: { icon: any; title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 40, scrollMarginTop: 90 }}>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: '#37352f', margin: '28px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color: '#2383e2' }} />
        {title}
      </h3>
      {children}
    </section>
  );
}

function DocCallout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      border: '1px solid rgba(35,131,226,0.15)', borderRadius: 8, padding: 14,
      background: 'rgba(35,131,226,0.04)', marginTop: 8,
    }}>
      <Lightbulb size={15} style={{ color: '#2383e2', flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 13, color: '#37352f', lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  );
}

function DocTable({ headers, rows, highlightFirst }: { headers: string[]; rows: string[][]; highlightFirst?: boolean }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {headers.map((h: string, i: number) => (
              <th key={i} style={{ textAlign: 'left', padding: '8px 12px', background: '#f7f6f3', fontWeight: 600, color: '#37352f', border: '1px solid #e8e5e0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: string[], i: number) => (
            <tr key={i}>
              {row.map((cell: string, j: number) => (
                <td key={j} style={{ padding: '8px 12px', border: '1px solid #e8e5e0', color: highlightFirst && j === 0 ? '#37352f' : '#6b6b6b', fontWeight: highlightFirst && j === 0 ? 500 : 400 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
