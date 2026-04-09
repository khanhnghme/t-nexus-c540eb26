import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Sparkles, AlertCircle, Info, MessageCircle, AlertTriangle, FolderKanban, Globe, Zap, Brain, CalendarClock, BarChart3, Users, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import tNexusLogo from '@/assets/t-nexus-logo.png';
import ReactMarkdown from 'react-markdown';
import UserAvatar from '@/components/UserAvatar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

// Usage limits
const MAX_MESSAGE_WORDS = 100;
const QUESTIONS_PER_PROJECT = 10;

const SUGGESTED_QUESTIONS = [
  { icon: CalendarClock, text: "Công việc nào sắp đến hạn?", color: "text-orange-500" },
  { icon: Zap, text: "Tiến độ project hiện tại?", color: "text-emerald-500" },
  { icon: BarChart3, text: "Điểm quá trình của tôi?", color: "text-rose-500" },
  { icon: Brain, text: "Hệ thống có những tính năng gì?", color: "text-blue-500" },
  { icon: Users, text: "Hướng dẫn tạo project mới", color: "text-violet-500" },
];

// Get usage key based on user and date
const getUsageKey = (userId: string) => `ai_usage_${userId}_${new Date().toDateString()}`;
const getProjectCountKey = (userId: string) => `ai_project_count_${userId}`;

// Count words in a string
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export default function AIAssistantPanel({ 
  isOpen, 
  onClose, 
  projectId,
  projectName 
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionsToday, setQuestionsToday] = useState(0);
  const [projectCount, setProjectCount] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Calculate max questions based on project count
  const maxQuestions = QUESTIONS_PER_PROJECT * projectCount;

  // Load usage count and project count
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      const usageKey = getUsageKey(user.id);
      const stored = localStorage.getItem(usageKey);
      setQuestionsToday(stored ? parseInt(stored, 10) : 0);

      try {
        const { count, error } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && count !== null) {
          setProjectCount(Math.max(1, count));
          localStorage.setItem(getProjectCountKey(user.id), count.toString());
        } else {
          const cached = localStorage.getItem(getProjectCountKey(user.id));
          if (cached) setProjectCount(Math.max(1, parseInt(cached, 10)));
        }
      } catch {
        const cached = localStorage.getItem(getProjectCountKey(user.id));
        if (cached) setProjectCount(Math.max(1, parseInt(cached, 10)));
      }
    };

    if (isOpen) loadData();
  }, [user?.id, isOpen]);

  // Auto scroll to bottom — like Zalo: always scroll to latest message
  const isUserScrollingUp = useRef(false);
  const lastScrollHeight = useRef(0);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // User is "scrolled up" if more than 100px from bottom
      isUserScrollingUp.current = scrollHeight - scrollTop - clientHeight > 100;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (!el) return;

    // Always scroll to bottom when new message added or content streamed, unless user scrolled up
    if (!isUserScrollingUp.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
    lastScrollHeight.current = el.scrollHeight;
  }, [messages]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const incrementUsage = () => {
    if (user?.id) {
      const usageKey = getUsageKey(user.id);
      const newCount = questionsToday + 1;
      localStorage.setItem(usageKey, newCount.toString());
      setQuestionsToday(newCount);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const wordCount = countWords(messageText);

    if (wordCount > MAX_MESSAGE_WORDS) {
      toast({
        title: 'Câu hỏi quá dài',
        description: `Vui lòng giới hạn câu hỏi trong ${MAX_MESSAGE_WORDS} từ (hiện tại: ${wordCount} từ).`,
        variant: 'destructive',
      });
      return;
    }

    if (questionsToday >= maxQuestions) {
      toast({
        title: 'Đã hết lượt hỏi hôm nay',
        description: `Bạn đã sử dụng ${maxQuestions} câu hỏi (${projectCount} project × ${QUESTIONS_PER_PROJECT} lượt). Vui lòng quay lại ngày mai.`,
        variant: 'destructive',
      });
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
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            projectId: projectId || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

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
                  updated[updated.length - 1] = { 
                    role: 'assistant', 
                    content: assistantContent 
                  };
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

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
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
                  updated[updated.length - 1] = { 
                    role: 'assistant', 
                    content: assistantContent 
                  };
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
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });

      toast({
        title: 'Lỗi',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (question: string) => {
    sendMessage(question);
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const remainingQuestions = maxQuestions - questionsToday;
  const wordCount = countWords(input);
  const isOverLimit = wordCount > MAX_MESSAGE_WORDS;
  const usagePercent = Math.min(100, (questionsToday / maxQuestions) * 100);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl p-0 flex flex-col h-full border-l-0 shadow-2xl data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground relative overflow-hidden animate-fade-in">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 ai-decor-spin" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 ai-decor-spin-reverse" />
          
          <div className="relative flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3 text-primary-foreground">
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-white/30 shadow-lg">
                  <AvatarImage src={tNexusLogo} alt="AI Assistant" />
                  <AvatarFallback className="bg-white/20">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold tracking-tight">T-Nexus AI</span>
                <span className="text-[11px] text-primary-foreground/70 font-normal">
                  {projectName ? `📁 ${projectName}` : '🌐 Hỗ trợ chung'}
                </span>
              </div>
            </SheetTitle>
            
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 h-8 px-2 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">Xóa chat</span>
              </Button>
            )}
          </div>
          <SheetDescription className="sr-only">
            T-Nexus AI — trợ lý AI hỗ trợ tra cứu thông tin về công việc, deadline và phân công
          </SheetDescription>
        </SheetHeader>

        {/* Scope + Usage bar - compact */}
        <div className="px-4 py-2.5 border-b bg-muted/30 space-y-2">
          {/* Scope */}
          <div className={cn(
            "flex items-center gap-2 text-xs rounded-lg px-3 py-2",
            projectId 
              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" 
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
          )}>
            {projectId ? (
              <>
                <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium truncate">Dữ liệu: {projectName}</span>
              </>
            ) : (
              <>
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">Trả lời tổng quan hệ thống</span>
              </>
            )}
          </div>

          {/* Usage bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  usagePercent > 80 ? "bg-destructive" : usagePercent > 50 ? "bg-warning" : "bg-primary"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
              {remainingQuestions}/{maxQuestions} lượt
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea 
          ref={scrollRef}
          className="flex-1 px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-4 px-2">
              {/* Hero section */}
              <div className="relative mb-5 ai-hero-entrance">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150 ai-pulse-glow" />
                <Avatar className="relative h-16 w-16 ring-4 ring-primary/10 shadow-xl ai-hero-bounce">
                  <AvatarImage src={tNexusLogo} alt="AI Assistant" />
                  <AvatarFallback className="bg-primary/10">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <h3 className="text-lg font-semibold mb-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Xin chào{profile?.full_name ? `, ${profile.full_name.split(' ').pop()}` : ''}! 👋
              </h3>
              <p className="text-xs text-muted-foreground text-center mb-5 max-w-[280px] leading-relaxed">
                {projectName 
                  ? `Mình có thể giúp bạn tra cứu thông tin về project "${projectName}".`
                  : 'Mình sẵn sàng hỗ trợ bạn tra cứu công việc, deadline và điểm quá trình.'
                }
              </p>
              
              {/* Suggested Questions - card grid */}
              <div className="w-full space-y-1.5">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-2 px-1">
                  💡 Thử hỏi
                </p>
                {SUGGESTED_QUESTIONS.map((q, idx) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(q.text)}
                      className={cn(
                        "w-full text-left px-3.5 py-3 rounded-xl border bg-card",
                        "hover:bg-accent/5 hover:border-primary/30 hover:shadow-sm",
                        "transition-all duration-200 text-sm flex items-center gap-3",
                        "group active:scale-[0.98] ai-suggestion-card"
                      )}
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg bg-muted/80 shrink-0",
                        "group-hover:bg-primary/10 transition-colors"
                      )}>
                        <Icon className={cn("h-4 w-4", q.color)} />
                      </div>
                      <span className="text-foreground/80 group-hover:text-foreground transition-colors">{q.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-2.5 animate-fade-in",
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  {message.role === 'assistant' ? (
                    <Avatar className="h-7 w-7 shrink-0 mt-1 ring-1 ring-border shadow-sm">
                      <AvatarImage src={tNexusLogo} alt="AI" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <UserAvatar 
                      src={profile?.avatar_url}
                      name={profile?.full_name}
                      size="sm"
                      className="ring-1 ring-border shrink-0 mt-1 shadow-sm"
                    />
                  )}

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "max-w-[82%] text-sm leading-relaxed",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm'
                        : 'bg-muted/50 border border-border/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
                    )}
                  >
                    {message.content ? (
                      message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-foreground prose-headings:text-foreground prose-headings:text-sm">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="text-sm">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )
                    ) : (
                      <div className="flex items-center gap-3 py-1.5">
                        <div className="flex gap-1.5 items-center">
                          <span className="w-2.5 h-2.5 rounded-full ai-typing-dot bg-primary/60" style={{ animationDelay: '0ms' }} />
                          <span className="w-2.5 h-2.5 rounded-full ai-typing-dot bg-primary/60" style={{ animationDelay: '200ms' }} />
                          <span className="w-2.5 h-2.5 rounded-full ai-typing-dot bg-primary/60" style={{ animationDelay: '400ms' }} />
                        </div>
                        <span className="text-xs text-muted-foreground ai-thinking-text">
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3 ai-sparkle-spin text-primary/50" />
                            Đang suy nghĩ...
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Disclaimer */}
        <div className="px-4 py-2 border-t bg-muted/20">
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span>
              AI tạo câu trả lời tự động — vui lòng kiểm tra lại thông tin quan trọng.
            </span>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t p-3 bg-background/95 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={remainingQuestions <= 0 ? "Đã hết lượt hỏi hôm nay..." : "Hỏi về công việc, deadline, cuộc họp..."}
                disabled={isLoading || remainingQuestions <= 0}
                className={cn(
                  "min-h-[44px] max-h-[120px] resize-none pr-14 text-sm rounded-xl",
                  "focus-visible:ring-primary/30",
                  isOverLimit && "border-destructive focus-visible:ring-destructive"
                )}
                rows={1}
              />
              {input.trim() && (
                <span className={cn(
                  "absolute right-3 bottom-2 text-[10px] tabular-nums",
                  isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground"
                )}>
                  {wordCount}/{MAX_MESSAGE_WORDS}
                </span>
              )}
            </div>
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || isLoading || isOverLimit || remainingQuestions <= 0}
              className={cn(
                "shrink-0 h-11 w-11 rounded-xl shadow-sm",
                "transition-all duration-200",
                input.trim() && !isLoading && !isOverLimit && "shadow-md hover:shadow-lg"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {remainingQuestions <= 0 
              ? "Bạn đã hết lượt hỏi. Quay lại ngày mai nhé! 🌙"
              : "Enter để gửi · Shift+Enter xuống dòng"
            }
          </p>
        </div>
      </SheetContent>

      <style>{`
        /* Typing indicator - wave effect */
        @keyframes ai-typing-wave {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-8px); opacity: 1; }
        }
        .ai-typing-dot {
          animation: ai-typing-wave 1.4s ease-in-out infinite;
        }

        /* Sparkle spin */
        @keyframes ai-sparkle-spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .ai-sparkle-spin {
          animation: ai-sparkle-spin 2s linear infinite;
        }

        /* Thinking text shimmer */
        @keyframes ai-shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .ai-thinking-text {
          animation: ai-shimmer 2s ease-in-out infinite;
        }

        /* Hero entrance */
        @keyframes ai-hero-enter {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .ai-hero-entrance {
          animation: ai-hero-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* Hero gentle bounce */
        @keyframes ai-gentle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .ai-hero-bounce {
          animation: ai-gentle-bounce 3s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        /* Pulse glow behind hero */
        @keyframes ai-pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1.5); }
          50% { opacity: 0.6; transform: scale(1.8); }
        }
        .ai-pulse-glow {
          animation: ai-pulse-glow 3s ease-in-out infinite;
        }

        /* Suggestion cards staggered entrance */
        @keyframes ai-card-enter {
          0% { transform: translateX(20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .ai-suggestion-card {
          opacity: 0;
          animation: ai-card-enter 0.4s ease-out forwards;
        }

        /* Decorative spin */
        @keyframes ai-decor-rotate {
          0% { transform: translate(50%, -50%) rotate(0deg); }
          100% { transform: translate(50%, -50%) rotate(360deg); }
        }
        @keyframes ai-decor-rotate-reverse {
          0% { transform: translate(-50%, 50%) rotate(0deg); }
          100% { transform: translate(-50%, 50%) rotate(-360deg); }
        }
        .ai-decor-spin {
          animation: ai-decor-rotate 20s linear infinite;
        }
        .ai-decor-spin-reverse {
          animation: ai-decor-rotate-reverse 25s linear infinite;
        }
      `}</style>
    </Sheet>
  );
}
