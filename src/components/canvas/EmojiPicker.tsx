import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

const EMOJI_LIST = [
  "📄", "📝", "📋", "📌", "📎", "📁", "📂", "📚",
  "⭐", "🔥", "💡", "🎯", "🚀", "✅", "❗", "❓",
  "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪",
  "🏠", "🔧", "⚙️", "🎨", "💬", "📊", "📈", "🗂️",
];

interface EmojiPickerProps {
  currentEmoji?: string | null;
  onSelect: (emoji: string | null) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function EmojiPicker({ currentEmoji, onSelect, children, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start" side="right">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-sm transition-colors"
              onClick={() => { onSelect(emoji); setOpen(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
        {currentEmoji && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1.5 text-xs text-muted-foreground"
            onClick={() => { onSelect(null); setOpen(false); }}
          >
            <X className="h-3 w-3 mr-1" />
            Xóa icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
