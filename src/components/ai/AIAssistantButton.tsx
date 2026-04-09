import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AIAssistantPanel from './AIAssistantPanel';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, MessageCircle } from 'lucide-react';
import tNexusLogo from '@/assets/t-nexus-logo.png';
import zaloLogo from '@/assets/zalo-logo.png';

interface AIAssistantButtonProps {
  projectId?: string;
  projectName?: string;
  zaloLink?: string | null;
}

const TOOLTIP_MESSAGES = [
  "Bạn cần mình giúp gì không? 🥕",
  "Hỏi mình về deadline nhé!",
];

export default function AIAssistantButton({ projectId, projectName, zaloLink }: AIAssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  // Get random message
  const getRandomMessage = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * TOOLTIP_MESSAGES.length);
    return TOOLTIP_MESSAGES[randomIndex];
  }, []);

  // Show tooltip every 15 seconds, display for 3 seconds
  useEffect(() => {
    if (isOpen) return;

    const showTooltipCycle = () => {
      setCurrentMessage(getRandomMessage());
      setShowTooltip(true);
      
      // Hide after 3 seconds
      setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
    };

    // Initial show after 5 seconds
    const initialTimeout = setTimeout(showTooltipCycle, 5000);

    // Then show every 15 seconds
    const interval = setInterval(() => {
      if (!isOpen) {
        showTooltipCycle();
      }
    }, 15000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isOpen, getRandomMessage]);

  const handleOpen = () => {
    setIsOpen(true);
    setShowTooltip(false);
  };

  const handleZaloClick = () => {
    if (zaloLink) {
      window.open(zaloLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      {/* Tooltip Bubble - positioned above all buttons */}
      <div 
        className={cn(
          "fixed right-6 z-[60]",
          "bg-card/95 backdrop-blur-sm border border-border/80 rounded-2xl shadow-lg",
          "px-4 py-2.5 max-w-[220px]",
          "transition-all duration-300 ease-out",
          "before:content-[''] before:absolute before:bottom-[-6px] before:right-10",
          "before:w-3 before:h-3 before:bg-card/95 before:border-r before:border-b before:border-border/80",
          "before:rotate-45 before:rounded-sm",
          // Position higher when Zalo button exists (AI 80px + gap 12px + Zalo 48px + gap 16px = ~156px from bottom)
          zaloLink ? "bottom-44" : "bottom-32",
          showTooltip && !isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        )}
      >
        <p className="text-sm text-foreground/90 font-medium leading-snug">
          {currentMessage}
        </p>
      </div>

      {/* Floating Buttons Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
        {/* Zalo Contact Button - Above AI Button, smaller */}
        {zaloLink && (
          <Button
            onClick={handleZaloClick}
            size="sm"
            className={cn(
              "relative rounded-full h-12 w-12 shadow-xl p-0",
              "bg-white hover:bg-gray-50",
              "transition-all duration-300 hover:scale-110",
              "group overflow-hidden",
              "ring-2 ring-[#0068FF]/30"
            )}
            title="Liên hệ qua Zalo"
          >
            <img 
              src={zaloLogo} 
              alt="Zalo" 
              className="h-8 w-8 object-contain"
            />
            <span className="sr-only">Liên hệ Zalo</span>
          </Button>
        )}

        {/* AI Button - With continuous subtle animations */}
        <div className="relative">
          {/* Animated ring pulse effect */}
          <div className="absolute inset-0 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: '2s' }} />
          
          <Button
            onClick={handleOpen}
            size="lg"
            className={cn(
              "relative rounded-full h-20 w-20 shadow-2xl p-0",
              "bg-white hover:bg-gray-50",
              "transition-all duration-300 hover:scale-110",
              "group overflow-hidden",
              "ring-2 ring-primary/20 hover:ring-primary/40"
            )}
          >
            <Avatar className="h-[72px] w-[72px] transition-transform group-hover:scale-110 animate-float">
              <AvatarImage src={tNexusLogo} alt="AI Assistant" className="object-cover rounded-full" />
              <AvatarFallback className="bg-transparent">
                <Sparkles className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">Mở T-Nexus AI</span>
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-3px) scale(1.02);
          }
        }
        
        .animate-float {
          animation: float 2.5s ease-in-out infinite;
        }
      `}</style>

      <AIAssistantPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </>
  );
}
