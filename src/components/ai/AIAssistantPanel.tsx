import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Sparkles, AlertCircle, FolderKanban, Globe, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import tNexusTextLogo from '@/assets/t-nexus-text.png';

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

const MAX_MESSAGE_WORDS = 100;

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
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [usageLoading, setUsageLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadUsage = async () => {
      if (!user?.id) { setUsageLoading(false); return; }

      const today = new Date().toISOString().slice(0, 10);
      try {
        // Fetch usage and plan limit in parallel
        const [usageRes, profileRes] = await Promise.all([
          supabase.from('ai_daily_usage').select('message_count').eq('user_id', user.id).eq('usage_date', today).maybeSingle(),
          supabase.from('profiles').select('user_plan').eq('id', user.id).single(),
        ]);

        setQuestionsToday(usageRes.data?.message_count ?? 0);

        const userPlan = (profileRes.data as any)?.user_plan || 'plan_free';
        const { data: limitData } = await supabase
          .from('plan_limits')
          .select('max_ai_messages_per_day')
          .eq('plan', userPlan as any)
          .maybeSingle();

        setMaxQuestions((limitData as any)?.max_ai_messages_per_day ?? 5);
      } catch {
        // fallback defaults
      }
      setUsageLoading(false);
    };

    if (isOpen) loadUsage();
  }, [user?.id, isOpen]);

  const isUserScrollingUp = useRef(false);
  const lastScrollHeight = useRef(0);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      isUserScrollingUp.current = scrollHeight - scrollTop - clientHeight > 100;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (!el) return;

    if (!isUserScrollingUp.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
    lastScrollHeight.current = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const incrementUsage = () => {
    setQuestionsToday(prev => prev + 1);
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

    if (maxQuestions !== null && questionsToday >= maxQuestions) {
      toast({
        title: 'Đã hết lượt hỏi hôm nay',
        description: `Bạn đã sử dụng hết ${maxQuestions} lượt hỏi AI. Vui lòng quay lại ngày mai hoặc nâng cấp gói.`,
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

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const isUnlimited = maxQuestions === null;
  const remainingQuestions = isUnlimited ? Infinity : maxQuestions - questionsToday;
  const wordCount = countWords(input);
  const isOverLimit = wordCount > MAX_MESSAGE_WORDS;
  const usagePercent = isUnlimited ? 0 : Math.min(100, (questionsToday / maxQuestions) * 100);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl p-0 flex flex-col h-full border-l shadow-xl"
      >
        {/* Header — Clean & Compact */}
        <SheetHeader className="px-4 py-3 border-b bg-background">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2.5 text-foreground">
              <Avatar className="h-8 w-8">
                <AvatarImage src={tNexusTextLogo} alt="AI Assistant" className="object-contain p-1 bg-white rounded-full" />
                <AvatarFallback className="bg-muted">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold">T-Nexus AI</span>
                <span className="text-[11px] text-muted-foreground font-normal flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Online
                </span>
              </div>
            </SheetTitle>
            
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-muted-foreground hover:text-foreground h-8 px-2 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">Xóa</span>
              </Button>
            )}
          </div>
          <SheetDescription className="sr-only">
            T-Nexus AI — trợ lý AI hỗ trợ tra cứu thông tin về công việc, deadline và phân công
          </SheetDescription>
        </SheetHeader>

        {/* Scope + Usage — Single compact row */}
        <div className="px-4 py-2 border-b flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {projectId ? (
              <>
                <FolderKanban className="h-3 w-3" />
                <span className="truncate max-w-[180px]">{projectName}</span>
              </>
            ) : (
              <>
                <Globe className="h-3 w-3" />
                <span>Tổng quan</span>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  usagePercent > 80 ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {remainingQuestions}/{maxQuestions}
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea 
          ref={scrollRef}
          className="flex-1 px-4 py-4"
        >
          {messages.length === 0 ? (
            /* Empty State — Minimal */
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Avatar className="h-12 w-12 mb-3">
                <AvatarImage src={tNexusTextLogo} alt="AI Assistant" className="object-contain p-1.5 bg-white rounded-full" />
                <AvatarFallback className="bg-muted">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">Hỏi bất cứ điều gì</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-2.5 animate-fade-in",
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <Avatar className="h-7 w-7 shrink-0 mt-1">
                      <AvatarImage src={tNexusTextLogo} alt="AI" className="object-contain p-1 bg-white rounded-full" />
                      <AvatarFallback className="bg-muted">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <UserAvatar 
                      src={profile?.avatar_url}
                      name={profile?.full_name}
                      size="sm"
                      className="shrink-0 mt-1"
                    />
                  )}

                  <div
                    className={cn(
                      "max-w-[82%] text-sm leading-relaxed",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5'
                        : 'bg-muted/40 rounded-2xl rounded-bl-md px-4 py-3'
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
                      /* Typing indicator — dots only */
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="w-2 h-2 rounded-full ai-typing-dot bg-foreground/30" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full ai-typing-dot bg-foreground/30" style={{ animationDelay: '200ms' }} />
                        <span className="w-2 h-2 rounded-full ai-typing-dot bg-foreground/30" style={{ animationDelay: '400ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/5 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area — Simple */}
        <div className="border-t p-3 bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={remainingQuestions <= 0 ? "Đã hết lượt hỏi hôm nay..." : "Nhập câu hỏi..."}
                disabled={isLoading || remainingQuestions <= 0}
                className={cn(
                  "min-h-[44px] max-h-[120px] resize-none pr-14 text-sm rounded-xl",
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
              className="shrink-0 h-11 w-11 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          {remainingQuestions <= 0 && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Bạn đã hết lượt hỏi. Quay lại ngày mai nhé!
            </p>
          )}
        </div>
      </SheetContent>

      <style>{`
        @keyframes ai-typing-wave {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .ai-typing-dot {
          animation: ai-typing-wave 1.4s ease-in-out infinite;
        }
      `}</style>
    </Sheet>
  );
}
