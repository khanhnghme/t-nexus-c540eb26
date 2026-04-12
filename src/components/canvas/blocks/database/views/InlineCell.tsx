import { memo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { PropertyDef } from "../types";

export interface CellProps {
  property: PropertyDef;
  value: any;
  editable: boolean;
  onChange: (value: any) => void;
}

export const InlineCell = memo(function InlineCell({ property, value, editable, onChange }: CellProps) {
  const [draft, setDraft] = useState<string | null>(null);

  switch (property.type) {
    case "checkbox":
      return (
        <Checkbox
          checked={!!value}
          disabled={!editable}
          onCheckedChange={(v) => onChange(!!v)}
          className="mx-auto"
        />
      );

    case "select": {
      const opt = property.options?.find((o) => o.id === value);
      if (!editable) {
        return opt ? (
          <Badge variant="outline" style={{ borderColor: opt.color, color: opt.color }} className="text-xs font-normal">
            {opt.label}
          </Badge>
        ) : <span className="text-muted-foreground text-xs">—</span>;
      }
      return (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full bg-transparent text-sm border-0 outline-none cursor-pointer h-7 px-1 rounded hover:bg-muted/50"
        >
          <option value="">—</option>
          {property.options?.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      );
    }

    case "number":
      if (!editable) return <span className="text-sm tabular-nums">{value ?? ""}</span>;
      return (
        <Input
          type="number"
          value={draft ?? value ?? ""}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== null) { onChange(draft === "" ? null : Number(draft)); setDraft(null); } }}
          className="h-7 border-0 shadow-none bg-transparent text-sm px-1"
        />
      );

    case "date":
      if (!editable) return <span className="text-sm text-muted-foreground">{value ?? ""}</span>;
      return (
        <Input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-7 border-0 shadow-none bg-transparent text-sm px-1"
        />
      );

    case "url":
      if (!editable) {
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate block max-w-[160px]">
            {value}
          </a>
        ) : <span className="text-muted-foreground text-xs">—</span>;
      }
      return (
        <Input
          type="url"
          value={draft ?? value ?? ""}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== null) { onChange(draft || null); setDraft(null); } }}
          placeholder="https://..."
          className="h-7 border-0 shadow-none bg-transparent text-sm px-1"
        />
      );

    default:
      if (!editable) return <span className="text-sm">{value ?? ""}</span>;
      return (
        <Input
          value={draft ?? value ?? ""}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== null) { onChange(draft); setDraft(null); } }}
          placeholder="Empty"
          className="h-7 border-0 shadow-none bg-transparent text-sm px-1"
        />
      );
  }
});
