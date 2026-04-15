import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, ArrowUp, FileText, ListChecks, BarChart3, PenLine, History, Plus, X, MessageSquare, MoreHorizontal, Pin, PinOff, Sparkles, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import tNexusIcon from '@/assets/t-nexus-icon.png';
import deepseekIcon from '@/assets/deepseek-icon.png';
import geminiIcon from '@/assets/gemini-icon.png';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/contexts/LanguageContext';

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
  is_pinned: boolean;
}

const MAX_MESSAGE_WORDS = 100;
const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(w => w.length > 0).length;

const MODEL_LABELS: Record<string, string> = {
  'deepseek-chat': 'DeepSeek V3.2',
  'google/gemini-2.5-flash-lite': 'Gemini Flash',
};
const MODEL_ICONS: Record<string, string> = {
  'deepseek-chat': deepseekIcon,
  'google/gemini-2.5-flash-lite': geminiIcon,
};
const getModelLabel = (model: string | null) => model ? (MODEL_LABELS[model] || model) : null;
const getModelIcon = (model: string | null) => model ? (MODEL_ICONS[model] || null) : null;
const getModelFromPlan = (plan?: string | null) =>
  ['plan_pro', 'plan_business', 'plan_custom'].includes(plan || '')
    ? 'deepseek-chat'
    : 'google/gemini-2.5-flash-lite';

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
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [maxCredits, setMaxCredits] = useState<number | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>('google/gemini-2.5-flash-lite');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user, profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();
  const { translations: t } = useLanguage();
  const { setAITopBarProps } = useDashboardLayoutContext();
  const navigate = useNavigate();

  const isFreePlan = maxCredits === null;
  const creditPercent = maxCredits ? Math.min(Math.round((creditsUsed / maxCredits) * 100), 100) : 0;
  const creditRemaining = maxCredits ? maxCredits - creditsUsed : null;
  const isLowCredit = maxCredits !== null && creditPercent >= 85;
  const isCriticalCredit = maxCredits !== null && creditPercent >= 95;

  const getProgressColorClass = () => {
    if (isCriticalCredit) return '[&>div]:bg-destructive';
    if (isLowCredit) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-emerald-500';
  };

  const suggestions = [
    { icon: FileText, label: t?.sidebar?.aiSuggestion1Label || 'Tóm tắt dự án', prompt: 'Tóm tắt nội dung và tiến độ dự án hiện tại của tôi' },
    { icon: ListChecks, label: t?.sidebar?.aiSuggestion2Label || 'Lên kế hoạch', prompt: 'Giúp tôi lên kế hoạch và phân chia công việc cho dự án' },
    { icon: BarChart3, label: t?.sidebar?.aiSuggestion3Label || 'Phân tích tiến độ', prompt: 'Phân tích tiến độ và hiệu suất làm việc của nhóm tôi' },
    { icon: PenLine, label: t?.sidebar?.aiSuggestion4Label || 'Viết báo cáo', prompt: 'Giúp tôi viết báo cáo tiến độ dự án' },
  ];

  useEffect(() => {
    setActiveModel(getModelFromPlan(profile?.user_plan));
  }, [profile?.user_plan]);

  // ── Load credit usage ──
  const loadUsage = useCallback(async () => {
    if (!user?.id) { setUsageLoading(false); return; }
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = now.toISOString().slice(0, 10);
    try {
      const effectiveOwnerId = activeWorkspace?.owner_id || user.id;
      const [creditRes, ownerProfileRes] = await Promise.all([
        supabase.rpc('get_owner_ai_credit_usage_month', { _owner_id: effectiveOwnerId, _month_start: monthStart, _month_end: monthEnd }),
        supabase.from('profiles').select('user_plan').eq('id', effectiveOwnerId).single(),
      ]);
      setCreditsUsed(typeof creditRes.data === 'number' ? creditRes.data : 0);
      const ownerPlan = (ownerProfileRes.data as any)?.user_plan || 'plan_free';
      setActiveModel(getModelFromPlan(ownerPlan));
      const { data: limitData } = await supabase
        .from('plan_limits').select('max_ai_credits_per_month')
        .eq('plan', ownerPlan as any).maybeSingle();
      setMaxCredits((limitData as any)?.max_ai_credits_per_month ?? null);
    } catch { /* fallback */ }
    setUsageLoading(false);
  }, [user?.id, activeWorkspace?.id, activeWorkspace?.owner_id]);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  // ── Load conversation history ──
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at, is_pinned')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data) setConversations(data.map(c => ({ ...c, is_pinned: !!(c as any).is_pinned })));
  }, [user?.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

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

  const saveMessage = async (conversationId: string, role: string, content: string) => {
    await supabase.from('ai_messages').insert({ conversation_id: conversationId, role, content } as any);
  };

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

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const incrementCredits = (delta: number) => setCreditsUsed(prev => prev + delta);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    const wc = countWords(messageText);
    if (wc > MAX_MESSAGE_WORDS) {
      toast({ title: 'Câu hỏi quá dài', description: `Vui lòng giới hạn trong ${MAX_MESSAGE_WORDS} từ (hiện tại: ${wc}).`, variant: 'destructive' });
      return;
    }
    if (maxCredits !== null && creditsUsed >= maxCredits) {
      toast({ title: 'Đã hết credit AI tháng này', description: `Đã sử dụng hết ${maxCredits} credit. Quay lại tháng sau hoặc nâng cấp gói.`, variant: 'destructive' });
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

      const modelHeader = response.headers.get('X-AI-Model');
      if (modelHeader) setActiveModel(modelHeader);

      // Don't increment credits here — tokens are tracked server-side
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
        // Re-fetch credit usage after successful message
        loadUsage();
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

  const handleDeleteAllConversations = async () => {
    if (!user?.id || conversations.length === 0) return;
    const confirmed = window.confirm(t?.sidebar?.confirmDeleteAll || 'Xóa tất cả lịch sử trò chuyện?');
    if (!confirmed) return;
    await supabase.from('ai_conversations').delete().eq('user_id', user.id);
    setMessages([]);
    setActiveConversationId(null);
    setConversations([]);
    toast({ title: t?.sidebar?.allDeleted || 'Đã xóa tất cả lịch sử' });
  };

  const handleTogglePin = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const newPinned = !conv.is_pinned;
    await supabase.from('ai_conversations').update({ is_pinned: newPinned } as any).eq('id', convId);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, is_pinned: newPinned } : c));
    toast({ title: newPinned ? 'Đã ghim cuộc trò chuyện' : 'Đã bỏ ghim' });
  };

  const wordCount = countWords(input);
  const isOverLimit = wordCount > MAX_MESSAGE_WORDS;

  const hasMessages = messages.length > 0;

  const clearChatRef = useRef(handleClearChat);
  clearChatRef.current = handleClearChat;

  useEffect(() => {
    setAITopBarProps({
      onToggleHistory: () => setShowHistory(prev => !prev),
      onClearChat: () => clearChatRef.current(),
      hasMessages,
    });
    return () => setAITopBarProps(null);
  }, [hasMessages, setAITopBarProps]);

  // ── Conversation Item ──
  const renderConvItem = (conv: Conversation) => (
    <div
      key={conv.id}
      onClick={() => loadConversation(conv.id)}
      title={conv.title || 'Untitled'}
      className={cn(
        "flex items-center gap-1 rounded-lg text-left text-sm transition-colors group cursor-pointer px-2 py-1.5",
        activeConversationId === conv.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      {conv.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary/60" />}
      <span className="truncate min-w-0 flex-1">{conv.title || 'Untitled'}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground transition-all">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={(e) => handleTogglePin(e as any, conv.id)}>
            {conv.is_pinned ? <PinOff className="h-3.5 w-3.5 mr-2" /> : <Pin className="h-3.5 w-3.5 mr-2" />}
            {conv.is_pinned ? 'Bỏ ghim' : 'Ghim'}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleDeleteConversation(e as any, conv.id)}>
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ── History Sidebar ──
  const historySidebar = (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 min-w-0 max-w-full overflow-hidden bg-card border-r border-border/60 shadow-2xl flex flex-col transition-transform duration-200",
      showHistory ? "translate-x-0" : "-translate-x-full"
    )} style={{ top: 56 }}>
      <div className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-border/40">
        <span className="text-sm font-medium text-foreground">{t?.sidebar?.chatHistory || 'Lịch sử trò chuyện'}</span>
        <div className="flex items-center gap-0.5">
          {conversations.length > 0 && (
            <button onClick={handleDeleteAllConversations} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={t?.sidebar?.deleteAll || 'Xóa tất cả'}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="shrink-0 px-3 py-2 min-w-0 max-w-full overflow-hidden">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/50 text-sm text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t?.sidebar?.newChat || 'Cuộc trò chuyện mới'}
        </button>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="px-2 py-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">{t?.sidebar?.noHistory || 'Chưa có lịch sử trò chuyện'}</p>
          ) : (
            <>
              {/* Pinned section */}
              {conversations.filter(c => c.is_pinned).length > 0 && (
                <div className="mb-3 min-w-0 max-w-full overflow-hidden">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5 font-medium flex items-center gap-1">
                    <Pin className="h-2.5 w-2.5" /> Đã ghim
                  </p>
                  {conversations.filter(c => c.is_pinned).map(conv => renderConvItem(conv))}
                </div>
              )}
              {/* Grouped unpinned */}
              {groupConversations(conversations.filter(c => !c.is_pinned), t).map(group => (
                <div key={group.label} className="mb-3 min-w-0 max-w-full overflow-hidden">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5 font-medium">{group.label}</p>
                  {group.items.map(conv => renderConvItem(conv))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );

  const overlay = showHistory && (
    <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" style={{ top: 56 }} onClick={() => setShowHistory(false)} />
  );

  // ── Shared Input ──
  const renderInput = (variant: 'empty' | 'chat') => (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={cn(
        "relative rounded-2xl transition-all duration-200",
        isOverLimit
          ? "border border-destructive/60 bg-destructive/5"
          : "border border-border/60 bg-muted/30 focus-within:bg-background focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
      )}>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t?.sidebar?.aiPlaceholder || "Hỏi bất cứ điều gì..."}
          disabled={isLoading}
          className={cn(
            "w-full resize-none border-0 bg-transparent placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0",
            variant === 'empty'
              ? "px-5 py-4 pr-16 min-h-[56px] max-h-[160px] text-[15px]"
              : "px-5 py-3.5 pr-14 min-h-[48px] max-h-[140px] text-sm"
          )}
          rows={1}
        />
        <div className={cn("absolute flex items-center gap-1.5", variant === 'empty' ? "right-3 bottom-3" : "right-2.5 bottom-2.5")}>
          {activeModel && (
            <span className="text-[10px] text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 select-none">
              {getModelIcon(activeModel) ? <img src={getModelIcon(activeModel)!} alt="" className="w-3 h-3 rounded-sm" /> : <span className="w-1 h-1 rounded-full bg-emerald-500/70" />}
              {getModelLabel(activeModel)}
            </span>
          )}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isOverLimit}
            className="p-2 rounded-xl bg-foreground text-background hover:bg-foreground/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? <Spinner size="sm" className="text-background" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {isOverLimit && (
        <p className="text-[11px] text-destructive mt-1.5 text-center">
          Vượt giới hạn {MAX_MESSAGE_WORDS} từ ({wordCount}/{MAX_MESSAGE_WORDS})
        </p>
      )}
    </form>
  );

  // ── Chat View ──
  if (hasMessages) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {overlay}
        {historySidebar}

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto min-h-0">
          {historyLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="default" />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
              {messages.map((message, idx) => (
                <div key={idx} className={cn("animate-fade-in", message.role === 'user' ? 'flex justify-end' : '')}>
                  {message.role === 'user' ? (
                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      <div className="bg-primary/10 text-foreground rounded-2xl rounded-br-md px-4 py-3 text-[14px] leading-relaxed">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="You" className="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover ring-1 ring-border/30" />
                      ) : (
                        <div className="w-7 h-7 rounded-full shrink-0 mt-0.5 bg-primary/15 flex items-center justify-center text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                          {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <img src={tNexusIcon} alt="AI" className="w-7 h-7 shrink-0 mt-0.5 dark:invert" />
                      <div className="text-[14px] leading-[1.7] text-foreground flex-1 min-w-0">
                        {message.content ? (
                          <AIMessageRenderer content={message.content} />
                        ) : (
                          <div className="flex items-center gap-1.5 py-2">
                            <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '200ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full ai-typing-dot bg-muted-foreground/40" style={{ animationDelay: '400ms' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {error && (
                <div className="text-destructive text-xs p-3 bg-destructive/5 rounded-xl border border-destructive/10">{error}</div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <div className="shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-sm px-4 md:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Compact credit indicator in chat mode */}
            {!usageLoading && !isFreePlan && maxCredits && (
              <div className="flex items-center gap-3 px-1">
                <div className="flex-1 min-w-0">
                  <Progress value={creditPercent} className={cn("h-1.5", getProgressColorClass())} />
                </div>
                <span className={cn(
                  "text-[11px] font-medium shrink-0",
                  isCriticalCredit ? "text-destructive" : isLowCredit ? "text-amber-500" : "text-muted-foreground"
                )}>
                  {creditsUsed.toLocaleString()}/{maxCredits.toLocaleString()} credit
                </span>
              </div>
            )}
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

  // ── Empty State ──
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {overlay}
      {historySidebar}

      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6">
        <div className="max-w-3xl w-full flex flex-col items-center animate-fade-in">
          {/* Logo + Greeting */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-[2.5] animate-pulse" />
            <img src={tNexusIcon} alt="T-Nexus" className="relative w-16 h-16 dark:invert drop-shadow-lg" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2 tracking-tight">
            {t?.sidebar?.aiGreeting || 'Hôm nay tôi có thể giúp gì cho bạn?'}
          </h1>
          <p className="text-sm text-muted-foreground/70 text-center mb-10">
            {t?.sidebar?.aiSubGreeting || 'Chọn một gợi ý bên dưới hoặc nhập câu hỏi của bạn'}
          </p>

          {/* Large Input */}
          <div className="w-full mb-8">
            <form onSubmit={handleSubmit} className="w-full">
              <div className={cn(
                "relative rounded-2xl transition-all duration-300 shadow-lg shadow-primary/5",
                isOverLimit
                  ? "border-2 border-destructive/60 bg-destructive/5"
                  : "border-2 border-border/50 bg-card focus-within:border-primary/50 focus-within:shadow-xl focus-within:shadow-primary/10"
              )}>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t?.sidebar?.aiPlaceholder || "Hỏi bất cứ điều gì..."}
                  disabled={isLoading}
                  className="w-full resize-none border-0 bg-transparent placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 px-6 py-5 pr-16 min-h-[64px] max-h-[180px] text-base"
                  rows={1}
                />
                <div className="absolute right-4 bottom-4 flex items-center gap-1.5">
                  {activeModel && (
                    <span className="text-[10px] text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 select-none">
                      {getModelIcon(activeModel) ? <img src={getModelIcon(activeModel)!} alt="" className="w-3 h-3 rounded-sm" /> : <span className="w-1 h-1 rounded-full bg-emerald-500/70" />}
                      {getModelLabel(activeModel)}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading || isOverLimit}
                    className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                  >
                    {isLoading ? <Spinner size="sm" className="text-primary-foreground" /> : <ArrowUp className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
              {isOverLimit && (
                <p className="text-[11px] text-destructive mt-2 text-center">
                  Vượt giới hạn {MAX_MESSAGE_WORDS} từ ({wordCount}/{MAX_MESSAGE_WORDS})
                </p>
              )}
            </form>
          </div>

          {/* Suggestions with staggered animation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(s.prompt)}
                disabled={isLoading}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border/40 bg-card/60 hover:bg-primary/5 hover:border-primary/30 hover:shadow-md transition-all duration-200 text-center group disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5 animate-fade-in"
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'backwards' }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-200">
                  <s.icon className="h-4.5 w-4.5 text-primary/70 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground leading-tight transition-colors">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Credit Usage Bar - Empty State */}
          {!usageLoading && (
            <div className="w-full mt-8 animate-fade-in" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
              {isFreePlan ? (
                <div className="flex items-center justify-center">
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {t?.sidebar?.aiFreeLabel || 'Miễn phí'} · {getModelLabel(activeModel)}
                  </Badge>
                </div>
              ) : maxCredits ? (
                <div className="max-w-sm mx-auto space-y-2.5 p-4 rounded-xl border border-border/40 bg-card/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      {t?.sidebar?.aiCreditsUsed || 'Đã sử dụng'}
                    </span>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      isCriticalCredit ? "text-destructive" : isLowCredit ? "text-amber-500" : "text-foreground"
                    )}>
                      {creditsUsed.toLocaleString()} / {maxCredits.toLocaleString()} credit
                    </span>
                  </div>
                  <Progress value={creditPercent} className={cn("h-2", getProgressColorClass())} />
                  {isLowCredit && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {t?.sidebar?.aiCreditLow || 'Sắp hết credit'}
                      </span>
                      <button
                        onClick={() => navigate('/upgrade')}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        {t?.sidebar?.aiUpgrade || 'Nâng cấp'}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
