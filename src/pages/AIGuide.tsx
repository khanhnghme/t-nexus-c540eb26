import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { TNexusLogo } from '@/components/TNexusLogo';
import LanguageToggle from '@/components/LanguageToggle';
import {
  ArrowLeft, Cpu, Zap, BarChart3, Shield, Lightbulb, HelpCircle,
  Menu, X, ChevronRight, Sparkles, Clock, MessageSquare,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  TOC                                                                 */
/* ------------------------------------------------------------------ */

interface TocEntry { id: string; label: { en: string; vi: string }; level: 1 | 2; }

const TOC: TocEntry[] = [
  { id: 'intro', label: { en: 'Introduction', vi: 'Giới thiệu' }, level: 1 },
  { id: 'how-credits-work', label: { en: 'How credits work', vi: 'Cách tính credit' }, level: 1 },
  { id: 'credit-formula', label: { en: 'Formula', vi: 'Công thức' }, level: 2 },
  { id: 'credit-examples', label: { en: 'Examples', vi: 'Ví dụ' }, level: 2 },
  { id: 'plan-limits', label: { en: 'Plan limits', vi: 'Giới hạn theo gói' }, level: 1 },
  { id: 'free-plus', label: { en: 'Free & Plus', vi: 'Free & Plus' }, level: 2 },
  { id: 'pro-business', label: { en: 'Pro & Business', vi: 'Pro & Business' }, level: 2 },
  { id: 'transparency', label: { en: 'Transparency', vi: 'Minh bạch & kiểm soát' }, level: 1 },
  { id: 'tips', label: { en: 'Save credits', vi: 'Mẹo tiết kiệm' }, level: 1 },
  { id: 'faq', label: { en: 'FAQ', vi: 'Câu hỏi thường gặp' }, level: 1 },
];

/* ------------------------------------------------------------------ */
/*  Content                                                             */
/* ------------------------------------------------------------------ */

const content = {
  en: {
    title: 'AI Usage Guide',
    subtitle: 'Understand how AI credits work — simply and transparently.',
    introTitle: 'Introduction',
    introP1: 'The AI assistant in T-Nexus is designed to help you work smarter. Usage is measured based on the actual resources consumed — and we convert that into a simple unit called a **credit**.',
    introP2: 'You don\'t need to understand any technical details. Just think of credits as "fuel" for AI conversations — the more you chat, the more credits you use.',
    howTitle: 'How credits work',
    formulaTitle: 'Formula',
    formulaP1: 'Every time you send a message to the AI, the system measures the amount of content processed (both your message and the AI\'s response).',
    formulaRule1: '**1 credit = 1,000 tokens** of usage',
    formulaRule2: 'Tokens are units of text — roughly **750 English words** or **500 Vietnamese words** equal 1,000 tokens',
    formulaRule3: 'Each message costs **at least 1 credit**, rounded up',
    examplesTitle: 'Examples',
    example1: 'A short question + answer → **1–2 credits**',
    example2: 'Asking AI to summarize a long document → **3–5 credits**',
    example3: 'A detailed analysis with tables and charts → **5–10 credits**',
    exampleNote: '💡 Shorter, more focused questions = fewer credits.',
    planTitle: 'Plan limits',
    freePlusTitle: 'Free & Plus',
    freePlusP1: 'Free and Plus users get access to the **default AI model** at no credit cost.',
    freePlusP2: '⚠️ **Important:** The default AI may experience slower response times or temporary unavailability during peak usage periods. This tier does not guarantee uptime or speed.',
    freePlusP3: 'If you need reliable, high-quality AI responses — consider upgrading to Pro or Business.',
    proBusinessTitle: 'Pro & Business',
    proBusinessP1: 'Pro and Business plans use the **advanced AI model (DeepSeek V3.2)** — faster, smarter, and more reliable.',
    proLimit: '**Pro:** 1,000 credits / month',
    businessLimit: '**Business:** 2,500 credits / month',
    proBusinessP2: 'Credits reset at the beginning of each billing cycle. Unused credits do not carry over.',
    transparencyTitle: 'Transparency & control',
    transparencyP1: 'We believe you should always know exactly where your credits stand. After every message, you can see:',
    transparencyItem1: '✅ Credits used this session',
    transparencyItem2: '✅ Remaining credits for the month',
    transparencyItem3: '✅ Real-time usage bar in the AI assistant',
    transparencyP2: 'The system updates your usage **instantly** after each message — no surprises.',
    tipsTitle: 'Tips to save credits',
    tip1: '**Be specific:** Clear, focused questions use fewer credits than vague ones.',
    tip2: '**Avoid repeating:** Don\'t re-ask the same question — scroll up to find previous answers.',
    tip3: '**Use bullet points:** Structured input helps the AI respond more efficiently.',
    tip4: '**Keep context short:** Start a new conversation when switching topics instead of continuing a long thread.',
    faqTitle: 'Frequently Asked Questions',
    faq1Q: 'What happens when I run out of credits?',
    faq1A: 'You\'ll see a notification that your monthly credits are exhausted. You can still use the default AI (Free/Plus tier), or wait for your credits to reset next billing cycle.',
    faq2Q: 'Can I buy more credits?',
    faq2A: 'Additional AI credits can be purchased as an add-on from your billing settings.',
    faq3Q: 'Do credits carry over to the next month?',
    faq3A: 'No. Unused credits expire at the end of each billing cycle.',
    faq4Q: 'Why does the same question cost different credits each time?',
    faq4A: 'Credit cost depends on the total content processed — including conversation history. Longer threads naturally cost more per message.',
    faq5Q: 'Is the Free/Plus AI the same as Pro/Business AI?',
    faq5A: 'No. Free/Plus uses a standard model which may be slower during peak times. Pro/Business uses DeepSeek V3.2 — a more powerful and reliable model.',
  },
  vi: {
    title: 'Hướng dẫn sử dụng AI',
    subtitle: 'Hiểu cách tính credit AI — đơn giản và minh bạch.',
    introTitle: 'Giới thiệu',
    introP1: 'Trợ lý AI trong T-Nexus được thiết kế để giúp bạn làm việc thông minh hơn. Mức sử dụng được đo dựa trên tài nguyên thực tế — và chúng tôi quy đổi thành đơn vị đơn giản gọi là **credit**.',
    introP2: 'Bạn không cần hiểu bất kỳ chi tiết kỹ thuật nào. Hãy nghĩ credit như "nhiên liệu" cho cuộc trò chuyện AI — bạn chat càng nhiều, credit tiêu tốn càng lớn.',
    howTitle: 'Cách tính credit',
    formulaTitle: 'Công thức',
    formulaP1: 'Mỗi lần bạn gửi tin nhắn cho AI, hệ thống sẽ đo lượng nội dung được xử lý (bao gồm cả tin nhắn của bạn và câu trả lời của AI).',
    formulaRule1: '**1 credit = 1.000 token** sử dụng',
    formulaRule2: 'Token là đơn vị văn bản — khoảng **750 từ tiếng Anh** hoặc **500 từ tiếng Việt** tương đương 1.000 token',
    formulaRule3: 'Mỗi tin nhắn tốn **ít nhất 1 credit**, làm tròn lên',
    examplesTitle: 'Ví dụ',
    example1: 'Một câu hỏi ngắn + câu trả lời → **1–2 credit**',
    example2: 'Yêu cầu AI tóm tắt tài liệu dài → **3–5 credit**',
    example3: 'Phân tích chi tiết với bảng và biểu đồ → **5–10 credit**',
    exampleNote: '💡 Câu hỏi ngắn gọn, đúng trọng tâm = ít credit hơn.',
    planTitle: 'Giới hạn theo gói',
    freePlusTitle: 'Free & Plus',
    freePlusP1: 'Người dùng Free và Plus được sử dụng **mô hình AI mặc định** mà không tốn credit.',
    freePlusP2: '⚠️ **Lưu ý:** AI mặc định có thể phản hồi chậm hơn hoặc tạm thời không khả dụng trong giờ cao điểm. Gói này không đảm bảo tốc độ hay thời gian hoạt động.',
    freePlusP3: 'Nếu bạn cần AI ổn định, chất lượng cao — hãy cân nhắc nâng cấp lên Pro hoặc Business.',
    proBusinessTitle: 'Pro & Business',
    proBusinessP1: 'Gói Pro và Business sử dụng **mô hình AI nâng cao (DeepSeek V3.2)** — nhanh hơn, thông minh hơn và ổn định hơn.',
    proLimit: '**Pro:** 1.000 credit / tháng',
    businessLimit: '**Business:** 2.500 credit / tháng',
    proBusinessP2: 'Credit được đặt lại vào đầu mỗi chu kỳ thanh toán. Credit chưa dùng sẽ không được cộng dồn.',
    transparencyTitle: 'Minh bạch & kiểm soát',
    transparencyP1: 'Chúng tôi tin rằng bạn luôn cần biết chính xác tình trạng credit của mình. Sau mỗi tin nhắn, bạn có thể thấy:',
    transparencyItem1: '✅ Credit đã dùng trong phiên',
    transparencyItem2: '✅ Credit còn lại trong tháng',
    transparencyItem3: '✅ Thanh usage cập nhật realtime trong trợ lý AI',
    transparencyP2: 'Hệ thống cập nhật usage **ngay lập tức** sau mỗi tin nhắn — không có gì bất ngờ.',
    tipsTitle: 'Mẹo tiết kiệm credit',
    tip1: '**Hỏi cụ thể:** Câu hỏi rõ ràng, đúng trọng tâm tiêu tốn ít credit hơn câu hỏi mơ hồ.',
    tip2: '**Không lặp lại:** Đừng hỏi lại câu hỏi đã có — cuộn lên để tìm câu trả lời trước đó.',
    tip3: '**Dùng gạch đầu dòng:** Đầu vào có cấu trúc giúp AI phản hồi hiệu quả hơn.',
    tip4: '**Giữ ngữ cảnh ngắn:** Bắt đầu cuộc trò chuyện mới khi đổi chủ đề thay vì tiếp tục chuỗi dài.',
    faqTitle: 'Câu hỏi thường gặp',
    faq1Q: 'Hết credit thì sao?',
    faq1A: 'Bạn sẽ thấy thông báo rằng credit tháng đã hết. Bạn vẫn có thể sử dụng AI mặc định (gói Free/Plus), hoặc đợi credit được đặt lại vào chu kỳ thanh toán tiếp theo.',
    faq2Q: 'Có thể mua thêm credit không?',
    faq2A: 'Credit AI bổ sung có thể được mua dưới dạng add-on từ cài đặt thanh toán của bạn.',
    faq3Q: 'Credit có cộng dồn sang tháng sau không?',
    faq3A: 'Không. Credit chưa sử dụng sẽ hết hạn vào cuối mỗi chu kỳ thanh toán.',
    faq4Q: 'Tại sao cùng một câu hỏi lại tốn credit khác nhau mỗi lần?',
    faq4A: 'Chi phí credit phụ thuộc vào tổng nội dung được xử lý — bao gồm lịch sử cuộc trò chuyện. Chuỗi dài hơn tự nhiên sẽ tốn nhiều credit hơn cho mỗi tin nhắn.',
    faq5Q: 'AI của Free/Plus có giống Pro/Business không?',
    faq5A: 'Không. Free/Plus sử dụng mô hình tiêu chuẩn, có thể chậm hơn vào giờ cao điểm. Pro/Business sử dụng DeepSeek V3.2 — mô hình mạnh mẽ và ổn định hơn.',
  },
};

/* ------------------------------------------------------------------ */
/*  Simple markdown-like bold renderer                                  */
/* ------------------------------------------------------------------ */

function Md({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function AIGuide() {
  const { locale, localizedPath: lp } = useLanguage();
  const navigate = useNavigate();
  const isVi = locale === 'vi';
  const d = isVi ? content.vi : content.en;

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

  /* ---------- styles ---------- */
  const sectionTitle: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: '#37352f', margin: '0 0 16px', scrollMarginTop: 90 };
  const subTitle: React.CSSProperties = { fontSize: 17, fontWeight: 600, color: '#37352f', margin: '24px 0 10px', scrollMarginTop: 90 };
  const paragraph: React.CSSProperties = { fontSize: 15, color: '#37352f', lineHeight: 1.75, margin: '0 0 14px' };
  const listItem: React.CSSProperties = { fontSize: 15, color: '#37352f', lineHeight: 1.75, margin: '0 0 6px', paddingLeft: 4 };
  const divider: React.CSSProperties = { border: 'none', borderTop: '1px solid #e8e5e0', margin: '36px 0' };
  const card: React.CSSProperties = { background: '#f7f6f3', borderRadius: 12, padding: '20px 24px', margin: '16px 0' };
  const alertCard: React.CSSProperties = { ...card, background: '#fef9ed', border: '1px solid #f0d88f' };
  const faqQ: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#37352f', margin: '0 0 6px' };
  const faqA: React.CSSProperties = { fontSize: 14, color: '#55534e', lineHeight: 1.7, margin: '0 0 20px' };

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
            className="ai-guide-mobile-toggle"
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#37352f' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button
            onClick={() => navigate(lp('/guide'))}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#37352f', fontSize: 14, fontWeight: 500, padding: 0 }}
          >
            <ArrowLeft size={16} />
            <span>{isVi ? 'Tài liệu' : 'Docs'}</span>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageToggle />
          <Link to={lp('/')} style={{ display: 'flex', alignItems: 'center' }}>
            <TNexusLogo className="h-5" style={{ filter: 'brightness(0)' }} />
          </Link>
        </div>
      </header>

      {/* ═══ Body ═══ */}
      <div style={{ display: 'flex', flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {/* --- Sidebar TOC --- */}
        <aside
          className={`ai-guide-sidebar ${sidebarOpen ? 'ai-guide-sidebar-open' : ''}`}
          style={{
            width: 240, flexShrink: 0, padding: '32px 20px', borderRight: '1px solid #e8e5e0',
            position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9b9a97', margin: '0 0 16px' }}>
            {isVi ? 'Mục lục' : 'Contents'}
          </p>
          {TOC.map((entry) => (
            <button
              key={entry.id}
              onClick={() => scrollTo(entry.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                padding: `5px ${entry.level === 2 ? 16 : 0}px`,
                fontSize: entry.level === 1 ? 14 : 13,
                fontWeight: entry.level === 1 ? 600 : 400,
                color: activeId === entry.id ? '#2383e2' : '#37352f',
                borderRadius: 4, transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f1ef'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              {entry.level === 2 && <ChevronRight size={12} style={{ opacity: 0.4 }} />}
              {isVi ? entry.label.vi : entry.label.en}
            </button>
          ))}
        </aside>

        {/* --- Main content --- */}
        <main style={{ flex: 1, padding: '40px 48px 80px', maxWidth: 760 }}>
          {/* Title */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Sparkles size={28} style={{ color: '#2383e2' }} />
              <h1 style={{ fontSize: 32, fontWeight: 700, color: '#37352f', margin: 0 }}>{d.title}</h1>
            </div>
            <p style={{ fontSize: 16, color: '#787774', margin: 0 }}>{d.subtitle}</p>
          </div>

          {/* ── 1. Introduction ── */}
          <h2 id="intro" style={sectionTitle}>
            <Cpu size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom', color: '#2383e2' }} />
            {d.introTitle}
          </h2>
          <p style={paragraph}><Md text={d.introP1} /></p>
          <p style={paragraph}><Md text={d.introP2} /></p>

          <hr style={divider} />

          {/* ── 2. How credits work ── */}
          <h2 id="how-credits-work" style={sectionTitle}>
            <Zap size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom', color: '#f5a623' }} />
            {d.howTitle}
          </h2>

          <h3 id="credit-formula" style={subTitle}>{d.formulaTitle}</h3>
          <p style={paragraph}><Md text={d.formulaP1} /></p>
          <div style={card}>
            <p style={listItem}>• <Md text={d.formulaRule1} /></p>
            <p style={listItem}>• <Md text={d.formulaRule2} /></p>
            <p style={listItem}>• <Md text={d.formulaRule3} /></p>
          </div>

          <h3 id="credit-examples" style={subTitle}>{d.examplesTitle}</h3>
          <div style={card}>
            <p style={listItem}><Md text={d.example1} /></p>
            <p style={listItem}><Md text={d.example2} /></p>
            <p style={listItem}><Md text={d.example3} /></p>
          </div>
          <p style={{ ...paragraph, fontSize: 14, color: '#787774' }}>{d.exampleNote}</p>

          <hr style={divider} />

          {/* ── 3. Plan limits ── */}
          <h2 id="plan-limits" style={sectionTitle}>
            <BarChart3 size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom', color: '#7c3aed' }} />
            {d.planTitle}
          </h2>

          <h3 id="free-plus" style={subTitle}>{d.freePlusTitle}</h3>
          <p style={paragraph}><Md text={d.freePlusP1} /></p>
          <div style={alertCard}>
            <p style={{ ...paragraph, margin: 0, fontSize: 14 }}><Md text={d.freePlusP2} /></p>
          </div>
          <p style={{ ...paragraph, fontSize: 14, color: '#787774' }}><Md text={d.freePlusP3} /></p>

          <h3 id="pro-business" style={subTitle}>{d.proBusinessTitle}</h3>
          <p style={paragraph}><Md text={d.proBusinessP1} /></p>
          <div style={card}>
            <p style={listItem}><Md text={d.proLimit} /></p>
            <p style={listItem}><Md text={d.businessLimit} /></p>
          </div>
          <p style={{ ...paragraph, fontSize: 14, color: '#787774' }}><Md text={d.proBusinessP2} /></p>

          <hr style={divider} />

          {/* ── 4. Transparency ── */}
          <h2 id="transparency" style={sectionTitle}>
            <Shield size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom', color: '#0ea5e9' }} />
            {d.transparencyTitle}
          </h2>
          <p style={paragraph}><Md text={d.transparencyP1} /></p>
          <div style={card}>
            <p style={listItem}>{d.transparencyItem1}</p>
            <p style={listItem}>{d.transparencyItem2}</p>
            <p style={listItem}>{d.transparencyItem3}</p>
          </div>
          <p style={paragraph}><Md text={d.transparencyP2} /></p>

          <hr style={divider} />

          {/* ── 5. Tips ── */}
          <h2 id="tips" style={sectionTitle}>
            <Lightbulb size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom', color: '#f59e0b' }} />
            {d.tipsTitle}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[d.tip1, d.tip2, d.tip3, d.tip4].map((tip, i) => (
              <div key={i} style={{ ...card, margin: 0, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 18px' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{['🎯', '🔁', '📝', '💬'][i]}</span>
                <p style={{ ...paragraph, margin: 0 }}><Md text={tip} /></p>
              </div>
            ))}
          </div>

          <hr style={divider} />

          {/* ── 6. FAQ ── */}
          <h2 id="faq" style={sectionTitle}>
            <HelpCircle size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom', color: '#6b7280' }} />
            {d.faqTitle}
          </h2>
          {[
            { q: d.faq1Q, a: d.faq1A },
            { q: d.faq2Q, a: d.faq2A },
            { q: d.faq3Q, a: d.faq3A },
            { q: d.faq4Q, a: d.faq4A },
            { q: d.faq5Q, a: d.faq5A },
          ].map((item, i) => (
            <div key={i}>
              <p style={faqQ}>{item.q}</p>
              <p style={faqA}><Md text={item.a} /></p>
            </div>
          ))}
        </main>
      </div>

      {/* ═══ Responsive styles ═══ */}
      <style>{`
        @media (max-width: 768px) {
          .ai-guide-mobile-toggle { display: flex !important; }
          .ai-guide-sidebar {
            position: fixed !important;
            top: 56px !important;
            left: 0;
            width: 260px !important;
            height: calc(100vh - 56px) !important;
            background: #fff;
            z-index: 40;
            transform: translateX(-100%);
            transition: transform 0.2s ease;
            border-right: 1px solid #e8e5e0;
          }
          .ai-guide-sidebar-open { transform: translateX(0) !important; }
          main { padding: 24px 16px 60px !important; }
        }
      `}</style>
    </div>
  );
}
