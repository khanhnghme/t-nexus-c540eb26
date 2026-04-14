import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Sparkles, AlertCircle, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import tNexusTextLogo from '@/assets/t-nexus-text.png';
import ReactMarkdown from 'react-markdown';
import UserAvatar from '@/components/UserAvatar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_MESSAGE_WORDS = 100;
const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(w => w.length > 0).length;

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionsToday, setQuestionsToday] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState<number | null>(5);
  const [usageLoading, setUsageLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user, profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  useEffect(() => {
    const loadUsage = async () => {
      if (!user?.id) { setUsageLoading(false); return; }
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const monthEnd = now.toISOString().slice(0, 10);
      try {
        const effectiveOwnerId = activeWorkspace?.owner_id || user.id;
        const [usageRes, ownerProfileRes] = await Promise.all([
          supabase.rpc('get_owner_ai_usage_month', { _owner_id: effectiveOwnerId, _month_start: monthStart, _month_end: monthEnd }),
          supabase.from('profiles').select('user_plan').eq('id', effectiveOwnerId).single(),
        ]);
        setQuestionsToday(typeof usageRes.data === 'number' ? usageRes.data : 0);
        const ownerPlan = (ownerProfileRes.data as any)?.user_plan || 'plan_free';
        const { data: limitData } = await supabase
          .from('plan_limits').select('max_ai_messages_per_month')
          .eq('plan', ownerPlan as any).maybeSingle();
        setMaxQuestions((limitData as any)?.max_ai_messages_per_month ?? 20);
      } catch { /* fallback */ }
      setUsageLoading(false);
    };
    loadUsage();
  }, [user?.id, activeWorkspace?.id]);

  const isUserScrollingUp = useRef(false);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      isUserScrollingUp.current = scrollHeight - scrollTop - clientHeight > 100;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isUserScrollingUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const incrementUsage = () => setQuestionsToday(prev => prev + 1);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    const wordCount = countWords(messageText);
    if (wordCount > MAX_MESSAGE_WORDS) {
      toast({ title: 'Câu hỏi quá dài', description: `Vui lòng giới hạn trong ${MAX_MESSAGE_WORDS} từ (hiện tại: ${wordCount}).`, variant: 'destructive' });
      return;
    }
    if (maxQuestions !== null && questionsToday >= maxQuestions) {
      toast({ title: 'Đã hết lượt hỏi tháng này', description: `Đã sử dụng hết ${maxQuestions} lượt tháng này. Quay lại tháng sau hoặc nâng cấp gói.`, variant: 'destructive' });
      return;
    }

    setError(null);
    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/team-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      if (!response.body) throw new Error('No response body');

      incrementUsage();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === 'assistant') {
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (const raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === 'assistant') {
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                }
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('AI Assistant error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(errorMessage);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1);
        return prev;
      });
      toast({ title: 'Lỗi', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };
  const handleClearChat = () => { setMessages([]); setError(null); };

  const isUnlimited = maxQuestions === null;
  const remainingQuestions = isUnlimited ? Infinity : maxQuestions - questionsToday;
  const wordCount = countWords(input);
  const isOverLimit = wordCount > MAX_MESSAGE_WORDS;
  const usagePercent = isUnlimited ? 0 : Math.min(100, (questionsToday / maxQuestions) * 100);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={tNexusTextLogo} alt="AI" className="object-contain p-1.5 bg-white rounded-full" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">T</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">T-Nexus AI</p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-muted-foreground">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isUnlimited ? (
            <span className="text-[11px] text-muted-foreground">∞ Unlimited</span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", usagePercent > 80 ? "bg-destructive" : "bg-foreground")}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">{questionsToday}/{maxQuestions}</span>
            </div>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <main ref={chatContainerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Avatar className="h-14 w-14 mb-4">
              <AvatarImage src={tNexusTextLogo} alt="AI" className="object-contain p-2 bg-white rounded-full" />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">T</AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">Hỏi bất cứ điều gì về công việc của bạn</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
            {messages.map((message, idx) => (
              <div key={idx} className={cn("flex gap-3 animate-fade-in", message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                {message.role === 'assistant' ? (
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarImage src={tNexusTextLogo} alt="AI" className="object-contain p-1 bg-white rounded-full" />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">T</AvatarFallback>
                  </Avatar>
                ) : (
                  <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="sm" className="shrink-0 mt-0.5" />
                )}
                <div className={cn(
                  "max-w-[75%] text-sm leading-relaxed",
                  message.role === 'user'
                    ? 'bg-foreground text-background rounded-2xl rounded-br-sm px-4 py-2.5'
                    : 'flex-1 text-muted-foreground'
                )}>
                  {message.content ? (
                    message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-foreground prose-headings:text-foreground prose-headings:text-sm">
                        <ReactMarkdown components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                        }}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '200ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '400ms' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/5 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input */}
      <div className="shrink-0 border-t border-border/60 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className={cn(
              "relative border rounded-xl transition-all",
              isOverLimit
                ? "border-destructive"
                : "border-border/80 bg-muted/30 focus-within:bg-background focus-within:border-border focus-within:shadow-sm"
            )}>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={remainingQuestions <= 0 ? "Đã hết lượt hỏi tháng này..." : "Nhập câu hỏi..."}
                disabled={isLoading || remainingQuestions <= 0}
                className="w-full resize-none border-0 bg-transparent px-4 py-3.5 pr-14 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[56px] max-h-[140px]"
                rows={2}
              />
              <div className="absolute right-2 bottom-2.5 flex items-center gap-2">
                {input.trim() && (
                  <span className={cn("text-[10px] tabular-nums", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    {wordCount}/{MAX_MESSAGE_WORDS}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || isOverLimit || remainingQuestions <= 0}
                  className="p-2 rounded-lg bg-foreground text-background hover:bg-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? <Spinner size="sm" className="text-background" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </form>
          {remainingQuestions <= 0 && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">Bạn đã hết lượt hỏi tháng này. Quay lại tháng sau nhé!</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ai-typing-wave {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .ai-typing-dot { animation: ai-typing-wave 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
