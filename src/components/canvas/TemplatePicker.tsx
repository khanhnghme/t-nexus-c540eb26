import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  onSelect: (content: Json | null) => void;
  selectedTemplateId: string | null;
}

export default function TemplatePicker({ workspaceId, onSelect, selectedTemplateId }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        let query = supabase
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải templates...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Chọn template</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {/* Blank option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-left transition-colors hover:bg-accent/50",
            selectedTemplateId === null && "border-primary bg-primary/5 ring-1 ring-primary"
          )}
        >
          <FileText className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm font-medium">Blank</span>
          <span className="text-xs text-muted-foreground text-center">Trang trắng</span>
        </button>

        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.content)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-left transition-colors hover:bg-accent/50",
              selectedTemplateId === t.id && "border-primary bg-primary/5 ring-1 ring-primary"
            )}
          >
            <span className="text-xl leading-none">{t.icon || "📄"}</span>
            <span className="text-sm font-medium truncate w-full text-center">{t.name}</span>
            {t.description && (
              <span className="text-xs text-muted-foreground text-center line-clamp-2">{t.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
