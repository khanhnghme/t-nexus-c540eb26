import { Link } from 'react-router-dom';
import { ArrowLeft, Users, CreditCard, Database, Package, HelpCircle, Lightbulb, ArrowRight, Lock, Clock, AlertTriangle, BookOpen, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import tNexusLogo from '@/assets/t-nexus-logo.png';

export default function PricingDocs() {
  const { translations: t, localizedPath: lp } = useLanguage();
  const d = t.pricingDocs;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={lp('/')} className="flex items-center gap-2">
            <img src={tNexusLogo} alt="T-Nexus" className="h-7 w-7" />
            <span className="font-heading font-bold text-foreground text-lg">T-Nexus</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to={lp('/pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t.common.pricing}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Back */}
        <Link to={lp('/pricing')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft size={14} />
          <span>{d.backToPricing}</span>
        </Link>

        {/* Title */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-foreground mb-3">
            {d.title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            {d.subtitle}
          </p>
        </div>

        {/* ── Table of Contents ── */}
        <TableOfContents d={d} />

        {/* ═══════════ CHƯƠNG 1 ═══════════ */}
        <div id="chapter-1" className="mb-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen size={20} className="text-primary" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-foreground">{d.ch1Label}</h2>
          </div>
        </div>

        {/* Section 1 */}
        <Section icon={CreditCard} title={d.s1Title} id="owner-billing">
          <p className="text-muted-foreground leading-relaxed mb-6">{d.s1Desc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {d.s1Steps.map((step: { title: string; desc: string }, i: number) => (
              <div key={i} className="relative rounded-xl border border-border bg-muted/30 p-5">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mb-3">
                  {i + 1}
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < 2 && (
                  <ArrowRight size={16} className="absolute right-[-14px] top-1/2 -translate-y-1/2 text-muted-foreground/40 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
          <Callout>{d.s1Callout}</Callout>
        </Section>

        {/* Section 2 */}
        <Section icon={Users} title={d.s2Title} id="unique-seat">
          <p className="text-muted-foreground leading-relaxed mb-6">{d.s2Desc}</p>
          <div className="rounded-xl border border-border overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {d.s2TableHeaders.map((h: string, i: number) => (
                    <th key={i} className="text-left px-4 py-3 font-medium text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.s2TableRows.map((row: string[], i: number) => (
                  <tr key={i} className="border-t border-border">
                    {row.map((cell: string, j: number) => (
                      <td key={j} className="px-4 py-3 text-muted-foreground">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout>{d.s2Callout}</Callout>
        </Section>

        {/* Section 3 */}
        <Section icon={Database} title={d.s3Title} id="resource-pool">
          <p className="text-muted-foreground leading-relaxed mb-6">{d.s3Desc}</p>
          <div className="rounded-xl border border-border overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {d.s3TableHeaders.map((h: string, i: number) => (
                    <th key={i} className="text-left px-4 py-3 font-medium text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.s3TableRows.map((row: string[], i: number) => (
                  <tr key={i} className="border-t border-border">
                    {row.map((cell: string, j: number) => (
                      <td key={j} className={`px-4 py-3 ${j === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout>{d.s3Callout}</Callout>
        </Section>

        {/* Section 4 */}
        <Section icon={Package} title={d.s4Title} id="addons">
          <p className="text-muted-foreground leading-relaxed mb-6">{d.s4Desc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {d.s4Items.map((item: { name: string; price: string; note: string }, i: number) => (
              <div key={i} className="rounded-xl border border-border p-5">
                <h4 className="font-semibold text-foreground text-sm mb-1">{item.name}</h4>
                <p className="text-primary font-bold text-lg mb-2">{item.price}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
          <Callout>{d.s4Callout}</Callout>
        </Section>

        {/* Section 5 */}
        <Section icon={Lightbulb} title={d.s5Title} id="examples">
          <div className="space-y-6">
            {d.s5Scenarios.map((sc: { title: string; desc: string; details: string[] }, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-muted/20 p-6">
                <h4 className="font-semibold text-foreground mb-2">{sc.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{sc.desc}</p>
                <ul className="space-y-1.5">
                  {sc.details.map((detail: string, j: number) => (
                    <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Section 6 */}
        <Section icon={HelpCircle} title={d.s6Title} id="faq">
          <div className="space-y-4">
            {d.s6Items.map((item: { q: string; a: string }, i: number) => (
              <div key={i} className="rounded-xl border border-border p-5">
                <h4 className="font-semibold text-foreground text-sm mb-2">{item.q}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════════ CHƯƠNG 2 ═══════════ */}
        <div id="chapter-2" className="mb-6 mt-16 pt-8 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-destructive" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-foreground">{d.ch2Label}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mb-8">{d.ch2Subtitle}</p>
        </div>

        {/* 2.1 Read-only */}
        <Section icon={Lock} title={d.ch2s1Title} id="read-only">
          <p className="text-muted-foreground leading-relaxed mb-6">{d.ch2s1Desc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-muted/20 p-5">
              <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <Check size={16} className="text-primary" />
                {t.language === 'vi' ? 'Được phép' : 'Allowed'}
              </h4>
              <ul className="space-y-2">
                {d.ch2s1Allowed.map((item: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Check size={14} className="text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <X size={16} className="text-destructive" />
                {t.language === 'vi' ? 'Bị cấm' : 'Blocked'}
              </h4>
              <ul className="space-y-2">
                {d.ch2s1Blocked.map((item: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <X size={14} className="text-destructive shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Callout>{d.ch2s1Callout}</Callout>
        </Section>

        {/* 2.2 30-day grace period */}
        <Section icon={Clock} title={d.ch2s2Title} id="grace-period">
          <p className="text-muted-foreground leading-relaxed mb-6">{d.ch2s2Desc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {d.ch2s2Options.map((opt: { title: string; desc: string; icon: string }, i: number) => (
              <div key={i} className={`rounded-xl border p-5 ${opt.icon === 'upgrade' ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-3 ${opt.icon === 'upgrade' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {i === 0 ? 'A' : 'B'}
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-2">{opt.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
              </div>
            ))}
          </div>
          <Callout>{d.ch2s2Callout}</Callout>
        </Section>

        {/* 2.3 Hard delete */}
        <Section icon={AlertTriangle} title={d.ch2s3Title} id="hard-delete">
          <p className="text-muted-foreground leading-relaxed mb-4">{d.ch2s3Desc}</p>
          <ul className="space-y-2 mb-6">
            {d.ch2s3Actions.map((action: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-border bg-muted/30 p-5 mb-6">
            <p className="text-sm text-foreground leading-relaxed font-medium">{d.ch2s3Rule}</p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 leading-relaxed">{d.ch2s3Callout}</p>
          </div>
        </Section>

        {/* CTA */}
        <div className="mt-12 mb-16 text-center">
          <p className="text-muted-foreground mb-4">{d.ch2CtaText || d.ctaText}</p>
          <Link
            to={lp('/pricing')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            {d.ch2CtaButton || d.ctaButton}
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════ Sub-components ═══════════════ */

function TableOfContents({ d }: { d: any }) {
  const items = d.tocItems;
  return (
    <nav className="rounded-xl border border-border bg-muted/20 p-6 mb-12">
      <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
        <BookOpen size={16} className="text-primary" />
        {d.tocTitle}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
        {/* Chapter 1 */}
        <div>
          <a href="#chapter-1" className="text-sm font-semibold text-foreground hover:text-primary transition-colors block py-1">
            {d.ch1Label}
          </a>
          <div className="ml-3 space-y-0.5">
            <TocLink href="#owner-billing">{items.s1}</TocLink>
            <TocLink href="#unique-seat">{items.s2}</TocLink>
            <TocLink href="#resource-pool">{items.s3}</TocLink>
            <TocLink href="#addons">{items.s4}</TocLink>
            <TocLink href="#examples">{items.s5}</TocLink>
            <TocLink href="#faq">{items.s6}</TocLink>
          </div>
        </div>
        {/* Chapter 2 */}
        <div>
          <a href="#chapter-2" className="text-sm font-semibold text-foreground hover:text-primary transition-colors block py-1">
            {d.ch2Label}
          </a>
          <div className="ml-3 space-y-0.5">
            <TocLink href="#read-only">{items.ch2s1}</TocLink>
            <TocLink href="#grace-period">{items.ch2s2}</TocLink>
            <TocLink href="#hard-delete">{items.ch2s3}</TocLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function TocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors block py-0.5">
      {children}
    </a>
  );
}

function Section({ icon: Icon, title, id, children }: { icon: any; title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-14 scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={18} className="text-primary" />
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <Lightbulb size={16} className="text-primary shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80 leading-relaxed">{children}</p>
    </div>
  );
}
