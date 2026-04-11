import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, Sparkles, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Json } from "@/integrations/supabase/types";

interface Template {
  id: string;
  name: string;
  description: string | null;
  content: Json;
  icon: string | null;
  category: string;
  is_system: boolean;
}

interface TemplatePickerProps {
  workspaceId?: string;
  onSelect: (content: Json | null, templateId: string | null) => void;
  selectedTemplateId: string | null;
}

export default function TemplatePicker({ workspaceId, onSelect, selectedTemplateId }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const query = supabase
          .from("project_templates")
          .select("id, name, description, content, icon, category, is_system")
          .order("is_system", { ascending: false })
          .order("name");

        const { data, error } = await query;
        if (error) throw error;
        setTemplates(data ?? []);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [workspaceId]);

  // Group by category
  const categories = new Map<string, Template[]>();
  templates.forEach((t) => {
    const cat = t.category || "Khác";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(t);
  });

  const filteredTemplates = search.trim()
    ? templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Đang tải templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Chọn template để bắt đầu</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Chọn một template có sẵn hoặc bắt đầu từ trang trắng. Bạn có thể chỉnh sửa sau.
        </p>
      </div>

      {/* Search */}
      {templates.length > 4 && (
        <div className="max-w-sm mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm template..."
            className="pl-9"
          />
        </div>
      )}

      {/* Blank option — featured */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => onSelect(null, null)}
          className={cn(
            "group relative flex items-center gap-3 px-6 py-4 rounded-xl border-2 border-dashed transition-all hover:border-primary/50 hover:bg-accent/30",
            selectedTemplateId === null
              ? "border-primary bg-primary/5"
              : "border-border"
          )}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
            <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-foreground">Trang trắng</span>
            <p className="text-xs text-muted-foreground">Bắt đầu từ đầu, tự do sáng tạo</p>
          </div>
        </button>
      </div>

      {/* Templates grid */}
      {filteredTemplates ? (
        /* Search results — flat grid */
        <div>
          {filteredTemplates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Không tìm thấy template phù hợp</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} selected={selectedTemplateId === t.id} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Grouped by category */
        Array.from(categories.entries()).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary/60" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</h3>
              <span className="text-[10px] text-muted-foreground/60">{items.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((t) => (
                <TemplateCard key={t.id} template={t} selected={selectedTemplateId === t.id} onSelect={onSelect} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TemplateCard({ template: t, selected, onSelect }: { template: Template; selected: boolean; onSelect: (content: Json | null, templateId: string | null) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(t.content, t.id)}
      className={cn(
        "group relative flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all text-center",
        "hover:shadow-md hover:border-primary/30 hover:bg-accent/20 hover:-translate-y-0.5",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm"
          : "border-border bg-card"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex items-center justify-center w-11 h-11 rounded-xl text-xl transition-colors",
        selected ? "bg-primary/10" : "bg-muted group-hover:bg-primary/10"
      )}>
        {t.icon || "📄"}
      </div>

      {/* Name */}
      <span className="text-sm font-medium text-foreground leading-tight line-clamp-1 w-full">
        {t.name}
      </span>

      {/* Description */}
      {t.description && (
        <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2 w-full">
          {t.description}
        </span>
      )}

      {/* System badge */}
      {t.is_system && (
        <span className="absolute top-1.5 right-1.5 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
          Mẫu
        </span>
      )}
    </button>
  );
}
