import { useState, useRef, useEffect } from "react";
import { ImageIcon, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmojiPicker from "./EmojiPicker";
import CoverPicker from "./CoverPicker";

interface PageHeaderProps {
  title: string;
  icon?: string | null;
  coverUrl?: string | null;
  editable?: boolean;
  onChangeTitle?: (title: string) => void;
  onChangeIcon?: (icon: string | null) => void;
  onChangeCover?: (coverUrl: string | null) => void;
}

export default function PageHeader({
  title,
  icon,
  coverUrl,
  editable,
  onChangeTitle,
  onChangeIcon,
  onChangeCover,
}: PageHeaderProps) {
  const [hovered, setHovered] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    if (editingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTitle]);

  const commitTitle = () => {
    setEditingTitle(false);
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== title) {
      onChangeTitle?.(trimmed);
    } else {
      setLocalTitle(title);
    }
  };

  return (
    <div
      className="px-6 pt-4 pb-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Quick actions row — visible on hover when items are missing */}
      {editable && hovered && (!icon || !coverUrl) && (
        <div className="flex items-center gap-1.5 mb-2">
          {!icon && (
            <EmojiPicker currentEmoji={null} onSelect={(emoji) => onChangeIcon?.(emoji)}>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground">
                <SmilePlus className="h-3.5 w-3.5" />
                Thêm icon
              </Button>
            </EmojiPicker>
          )}
          {!coverUrl && (
            <CoverPicker currentCover={null} onSelect={onChangeCover}>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                Thêm cover
              </Button>
            </CoverPicker>
          )}
        </div>
      )}

      {/* Icon */}
      {icon && (
        <div className="mb-2">
          {editable ? (
            <EmojiPicker currentEmoji={icon} onSelect={(emoji) => onChangeIcon?.(emoji)}>
              <button className="text-4xl hover:bg-accent rounded-lg p-1 transition-colors cursor-pointer">
                {icon}
              </button>
            </EmojiPicker>
          ) : (
            <span className="text-4xl p-1">{icon}</span>
          )}
        </div>
      )}

      {/* Title */}
      {editable && editingTitle ? (
        <input
          ref={inputRef}
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") { setLocalTitle(title); setEditingTitle(false); }
          }}
          className="text-3xl font-bold w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          placeholder="Untitled"
        />
      ) : (
        <h1
          className={`text-3xl font-bold text-foreground ${editable ? "cursor-text hover:bg-accent/50 rounded-md px-1 -mx-1 transition-colors" : ""}`}
          onClick={() => editable && setEditingTitle(true)}
        >
          {title || "Untitled"}
        </h1>
      )}
    </div>
  );
}
