import { useState, useRef, useEffect, useCallback } from "react";
import { ImageIcon, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmojiPicker from "./EmojiPicker";
import CoverPicker from "./CoverPicker";

interface PageHeaderProps {
  title: string;
  icon?: string | null;
  coverUrl?: string | null;
  editable?: boolean;
  groupId?: string;
  maxFileSizeMb?: number;
  onChangeTitle?: (title: string) => void;
  onChangeIcon?: (icon: string | null) => void;
  onChangeCover?: (coverUrl: string | null) => void;
}

export default function PageHeader({
  title,
  icon,
  coverUrl,
  editable,
  groupId,
  maxFileSizeMb,
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

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const commitTitle = useCallback(() => {
    setEditingTitle(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== title) {
      onChangeTitle?.(trimmed);
    } else {
      setLocalTitle(title);
    }
  }, [localTitle, title, onChangeTitle]);

  const handleTitleInputChange = useCallback((value: string) => {
    setLocalTitle(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed && trimmed !== title) {
        onChangeTitle?.(trimmed);
      }
    }, 600);
  }, [title, onChangeTitle]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      className="px-6 pt-8 pb-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editable && hovered && (!icon || !coverUrl) && (
        <div className="flex items-center gap-1.5 mb-3">
          {!icon && (
            <EmojiPicker currentEmoji={null} onSelect={(emoji) => onChangeIcon?.(emoji)}>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground">
                <SmilePlus className="h-3.5 w-3.5" />
                Thêm icon
              </Button>
            </EmojiPicker>
          )}
          {!coverUrl && (
            <CoverPicker currentCover={null} onSelect={onChangeCover} groupId={groupId} maxFileSizeMb={maxFileSizeMb}>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                Thêm cover
              </Button>
            </CoverPicker>
          )}
        </div>
      )}

      {icon && (
        <div className="mb-3">
          {editable ? (
            <EmojiPicker currentEmoji={icon} onSelect={(emoji) => onChangeIcon?.(emoji)}>
              <button className="text-5xl hover:bg-accent rounded-lg p-1 transition-colors cursor-pointer">
                {icon}
              </button>
            </EmojiPicker>
          ) : (
            <span className="text-5xl p-1">{icon}</span>
          )}
        </div>
      )}

      {editable && editingTitle ? (
        <input
          ref={inputRef}
          value={localTitle}
          onChange={(e) => handleTitleInputChange(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") { setLocalTitle(title); setEditingTitle(false); }
          }}
          className="text-4xl font-bold w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 leading-tight"
          placeholder="Untitled"
        />
      ) : (
        <h1
          className={`text-4xl font-bold text-foreground leading-tight ${editable ? "cursor-text hover:bg-accent/30 rounded-md px-1 -mx-1 transition-colors" : ""}`}
          onClick={() => editable && setEditingTitle(true)}
        >
          {title || "Untitled"}
        </h1>
      )}
    </div>
  );
}
