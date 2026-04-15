import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2, ArrowUp, FileText, ListChecks, BarChart3, PenLine, History, Plus, X, MessageSquare } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TNexusLogo } from '@/components/TNexusLogo';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const MAX_MESSAGE_WORDS = 100;
const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(w => w.length > 0).length;

function groupConversations(conversations: Conversation[], t: any) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);
  const monthAgo = new Date(todayStart.getTime() - 30 * 86400000);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: t?.sidebar?.today || 'Hôm nay', items: [] },
    { label: t?.sidebar?.last7Days || '7 ngày qua', items: [] },
    { label: t?.sidebar?.lastMonth || 'Tháng trước', items: [] },
    { label: t?.sidebar?.older || 'Cũ hơn', items: [] },
  ];

  for (const c of conversations) {
    const d = new Date(c.updated_at);
    if (d >= todayStart) groups[0].items.push(c);
    else if (d >= weekAgo) groups[1].items.push(c);
    else if (d >= monthAgo) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter(g => g.items.length > 0);
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionsToday, setQuestionsToday] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState<number | null>(5);
  const [usageLoading, setUsageLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user, profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();
  const { translations: t } = useLanguage();
  const { setAITopBarProps } = useDashboardLayoutContext();

  const suggestions = [
    { icon: FileText, label: t?.sidebar?.aiSuggestion1Label || 'Tóm tắt dự án', desc: t?.sidebar?.aiSuggestion1Desc || '', prompt: 'Tóm tắt nội dung và tiến độ dự án hiện tại của tôi' },
    { icon: ListChecks, label: t?.sidebar?.aiSuggestion2Label || 'Lên kế hoạch', desc: t?.sidebar?.aiSuggestion2Desc || '', prompt: 'Giúp tôi lên kế hoạch và phân chia công việc cho dự án' },
    { icon: BarChart3, label: t?.sidebar?.aiSuggestion3Label || 'Phân tích tiến độ', desc: t?.sidebar?.aiSuggestion3Desc || '', prompt: 'Phân tích tiến độ và hiệu suất làm việc của nhóm tôi' },
    { icon: PenLine, label: t?.sidebar?.aiSuggestion4Label || 'Viết báo cáo', desc: t?.sidebar?.aiSuggestion4Desc || '', prompt: 'Giúp tôi viết báo cáo tiến độ dự án' },
  ];

  // ── Load usage ──
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

  // ── Load conversation history ──
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  }, [user?.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages for a conversation ──
  const loadConversation = async (convId: string) => {
    setHistoryLoading(true);
    setActiveConversationId(convId);
    const { data } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    setError(null);
    setHistoryLoading(false);
    setShowHistory(false);
  };

  // ── Save message to DB ──
  const saveMessage = async (conversationId: string, role: string, content: string) => {
    await supabase.from('ai_messages').insert({ conversation_id: conversationId, role, content } as any);
  };

  // ── Create or get conversation ──
  const ensureConversation = async (firstMessage: string): Promise<string> => {
    if (activeConversationId) return activeConversationId;
    const title = firstMessage.slice(0, 50);
    const { data } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user!.id, title } as any)
      .select('id')
      .single();
    const id = data!.id;
    setActiveConversationId(id);
    loadConversations();
    return id;
  };

  // ── Scroll logic ──
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

    const convId = await ensureConversation(messageText);
    await saveMessage(convId, 'user', messageText);

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

      if (assistantContent) {
        await saveMessage(convId, 'assistant', assistantContent);
        await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() } as any).eq('id', convId);
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

  const handleClearChat = async () => {
    if (activeConversationId) {
      await supabase.from('ai_conversations').delete().eq('id', activeConversationId);
      loadConversations();
    }
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    setShowHistory(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    await supabase.from('ai_conversations').delete().eq('id', convId);
    if (activeConversationId === convId) {
      setMessages([]);
      setActiveConversationId(null);
    }
    loadConversations();
  };

  const isUnlimited = maxQuestions === null;
  const remainingQuestions = isUnlimited ? Infinity : maxQuestions - questionsToday;
  const wordCount = countWords(input);
  const isOverLimit = wordCount > MAX_MESSAGE_WORDS;
  const usagePercent = isUnlimited ? 0 : Math.min(100, (questionsToday / maxQuestions) * 100);

  const hasMessages = messages.length > 0;
  const grouped = groupConversations(conversations, t);

  // Ref to keep handleClearChat stable for context
  const clearChatRef = useRef(handleClearChat);
  clearChatRef.current = handleClearChat;

  // Sync AI controls to TopBar via context
  useEffect(() => {
    setAITopBarProps({
      onToggleHistory: () => setShowHistory(prev => !prev),
      onClearChat: () => clearChatRef.current(),
      hasMessages,
      questionsToday,
      maxQuestions,
      isUnlimited,
    });
    return () => setAITopBarProps(null);
  }, [hasMessages, questionsToday, maxQuestions, isUnlimited, setAITopBarProps]);

  // ── History Sidebar ──
  const historySidebar = (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-xl flex flex-col transition-transform duration-200",
      showHistory ? "translate-x-0" : "-translate-x-full"
    )} style={{ top: 56 }}>
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40">
        <span className="text-sm font-medium text-foreground">{t?.sidebar?.chatHistory || 'Lịch sử trò chuyện'}</span>
        <button onClick={() => setShowHistory(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 px-3 py-2">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/50 text-sm text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t?.sidebar?.newChat || 'Cuộc trò chuyện mới'}
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">{t?.sidebar?.noHistory || 'Chưa có lịch sử trò chuyện'}</p>
          ) : (
            grouped.map(group => (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5 font-medium">{group.label}</p>
                {group.items.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors group overflow-hidden min-w-0",
                      activeConversationId === conv.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{conv.title || 'Untitled'}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      title={t?.sidebar?.deleteConversation || 'Xóa'}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const overlay = showHistory && (
    <div className="fixed inset-0 z-40 bg-black/20" style={{ top: 56 }} onClick={() => setShowHistory(false)} />
  );

  // ── Input area (shared) ──
  const renderInput = (variant: 'empty' | 'chat') => (
    <form onSubmit={handleSubmit}>
      <div className={cn(
        "relative rounded-2xl transition-all duration-300",
        isOverLimit
          ? "border-2 border-destructive"
          : "border-2 border-border/40 bg-muted/10 focus-within:bg-background focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] focus-within:shadow-primary/10"
      )}>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={remainingQuestions <= 0 ? "Đã hết lượt..." : (t?.sidebar?.aiPlaceholder || "Hỏi bất cứ điều gì...")}
          disabled={isLoading || remainingQuestions <= 0}
          className={cn(
            "w-full resize-none border-0 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0",
            variant === 'empty' ? "px-5 py-5 pr-20 min-h-[64px] max-h-[160px] text-base" : "px-5 py-4 pr-14 min-h-[56px] max-h-[140px]"
          )}
          rows={variant === 'empty' ? 2 : 1}
        />
        <div className={cn("absolute flex items-center gap-2", variant === 'empty' ? "right-3 bottom-3" : "right-2 bottom-2")}>
          {input.trim() && (
            <span className={cn("text-[10px] tabular-nums", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
              {wordCount}/{MAX_MESSAGE_WORDS}
            </span>
          )}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isOverLimit || remainingQuestions <= 0}
            className="p-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Spinner size="sm" className="text-background" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </form>
  );


  // ── Chat state ──
  if (hasMessages) {
    return (
      <div className="flex flex-col h-[calc(100dvh-56px)] bg-background">
        {overlay}
        {historySidebar}

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto">
          {historyLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="default" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
              {messages.map((message, idx) => (
                <div key={idx} className={cn("animate-fade-in", message.role === 'user' ? 'flex justify-end' : '')}>
                  {message.role === 'user' ? (
                    <div className="max-w-[80%] bg-muted text-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed text-foreground">
                      {message.content ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-foreground prose-headings:text-foreground prose-headings:text-sm">
                          <ReactMarkdown components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                          }}>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '200ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '400ms' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {error && (
                <div className="text-destructive text-xs p-3 bg-destructive/5 rounded-xl">{error}</div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <div className="shrink-0 border-t border-border/40 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto">
            {renderInput('chat')}
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

  // ── Empty state ──
  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-background">
      {overlay}
      {historySidebar}
      

      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="max-w-2xl w-full flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-8">
            {t?.sidebar?.aiGreeting || 'Hôm nay tôi có thể giúp gì cho bạn?'}
          </h1>
          <div className="w-full mb-8">
            {renderInput('empty')}
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(s.prompt)}
                disabled={isLoading || remainingQuestions <= 0}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <s.icon className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {remainingQuestions <= 0 && (
            <p className="text-[11px] text-muted-foreground text-center mt-4">Bạn đã hết lượt hỏi tháng này. Quay lại tháng sau nhé!</p>
          )}
        </div>
      </div>
    </div>
  );
}
