import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Link, Check } from "lucide-react";

const PRESET_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)",
];

const PRESET_COLORS = [
  "#f3f4f6", "#fecaca", "#fed7aa", "#fef08a",
  "#bbf7d0", "#bae6fd", "#c7d2fe", "#e9d5ff",
];

interface CoverPickerProps {
  currentCover?: string | null;
  onSelect?: (cover: string | null) => void;
  children: ReactNode;
}

export default function CoverPicker({ currentCover, onSelect, children }: CoverPickerProps) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleSelect = (value: string) => {
    onSelect?.(value);
    setOpen(false);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onSelect?.(trimmed);
      setUrlInput("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <Tabs defaultValue="gradient">
          <TabsList className="w-full h-8 text-xs">
            <TabsTrigger value="gradient" className="text-xs">Gradient</TabsTrigger>
            <TabsTrigger value="color" className="text-xs">Màu</TabsTrigger>
            <TabsTrigger value="url" className="text-xs">URL ảnh</TabsTrigger>
          </TabsList>

          <TabsContent value="gradient" className="mt-2">
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_GRADIENTS.map((g) => (
                <button
                  key={g}
                  className="h-10 rounded-md border border-border hover:ring-2 hover:ring-primary/40 transition-all relative"
                  style={{ background: g }}
                  onClick={() => handleSelect(g)}
                >
                  {currentCover === g && (
                    <Check className="h-3.5 w-3.5 text-white absolute inset-0 m-auto drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="color" className="mt-2">
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className="h-10 rounded-md border border-border hover:ring-2 hover:ring-primary/40 transition-all relative"
                  style={{ background: c }}
                  onClick={() => handleSelect(c)}
                >
                  {currentCover === c && (
                    <Check className="h-3.5 w-3.5 text-foreground absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-2 space-y-2">
            <div className="flex gap-1.5">
              <Input
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                className="h-8 text-xs"
              />
              <Button size="sm" className="h-8 px-3" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                <Link className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {currentCover && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-destructive hover:text-destructive gap-1.5"
            onClick={() => { onSelect?.(null); setOpen(false); }}
          >
            <Trash2 className="h-3 w-3" />
            Xóa cover
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
