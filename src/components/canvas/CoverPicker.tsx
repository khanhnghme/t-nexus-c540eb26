import { useState, useRef, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Link, Check, Upload, Loader2 } from "lucide-react";
import { r2Storage, getR2FilePublicUrl } from "@/lib/r2Storage";
import { toast } from "sonner";

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface CoverPickerProps {
  currentCover?: string | null;
  onSelect?: (cover: string | null) => void;
  groupId?: string;
  children: ReactNode;
}

export default function CoverPicker({ currentCover, onSelect, groupId, children }: CoverPickerProps) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File ảnh không được vượt quá 5MB");
      return;
    }

    setUploading(true);
    try {
      const prefix = groupId ? `covers/${groupId}` : "covers";
      const path = `${prefix}/${Date.now()}-${file.name}`;

      const { error } = await r2Storage.from("project-resources").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        toast.error(error.message || "Tải ảnh thất bại");
        return;
      }

      const publicUrl = getR2FilePublicUrl("project-resources", path);
      onSelect?.(publicUrl);
      setOpen(false);
    } catch {
      toast.error("Tải ảnh thất bại");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
            <TabsTrigger value="upload" className="text-xs">Tải ảnh</TabsTrigger>
            <TabsTrigger value="url" className="text-xs">URL</TabsTrigger>
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

          <TabsContent value="upload" className="mt-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Đang tải..." : "Chọn ảnh từ máy"}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Tối đa 5MB • JPG, PNG, WebP</p>
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
