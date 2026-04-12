import { memo } from "react";
import {
  Database,
  CheckSquare,
  Users,
  CalendarDays,
  BookOpen,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { DATABASE_TEMPLATES, type DatabaseTemplate } from "./databaseTemplates";
import type { DatabaseBlockData } from "./types";

const iconMap: Record<string, LucideIcon> = {
  Database,
  CheckSquare,
  Users,
  CalendarDays,
  BookOpen,
  FileText,
};

interface Props {
  onSelect: (data: DatabaseBlockData) => void;
}

export const DatabaseTemplatePicker = memo(function DatabaseTemplatePicker({ onSelect }: Props) {
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Choose a template</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {DATABASE_TEMPLATES.map((t) => (
          <TemplateCard key={t.id} template={t} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
});

const TemplateCard = memo(function TemplateCard({
  template,
  onSelect,
}: {
  template: DatabaseTemplate;
  onSelect: (data: DatabaseBlockData) => void;
}) {
  const Icon = iconMap[template.icon] ?? Database;
  return (
    <button
      type="button"
      onClick={() => onSelect(template.build())}
      className="flex flex-col items-start gap-1 p-3 rounded-md border border-border bg-background hover:bg-accent/50 hover:border-primary/30 transition-colors text-left cursor-pointer"
    >
      <Icon className="h-5 w-5 text-primary shrink-0" />
      <span className="text-sm font-medium text-foreground">{template.name}</span>
      <span className="text-xs text-muted-foreground leading-snug">{template.description}</span>
    </button>
  );
});
