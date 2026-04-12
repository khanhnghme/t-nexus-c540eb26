import { memo, useCallback, useState } from "react";
import { ChevronRight, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineCell } from "./InlineCell";
import type { PropertyDef, DatabaseItem } from "../types";

interface ListViewProps {
  items: DatabaseItem[];
  properties: PropertyDef[];
  visiblePropertyIds: string[];
  editable: boolean;
  onUpdateItem: (itemId: string, propertyId: string, value: any) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (properties: Record<string, any>) => void;
}

export const ListView = memo(function ListView({
  items, properties, visiblePropertyIds, editable,
  onUpdateItem, onDeleteItem, onAddItem,
}: ListViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newRowName, setNewRowName] = useState("");

  const nameProperty = properties[0];
  const visibleProps = properties.filter((p) => visiblePropertyIds.includes(p.id));
  const secondaryProps = visibleProps.filter((p) => p.id !== nameProperty?.id);

  const handleAddRow = useCallback(() => {
    if (!nameProperty) return;
    onAddItem({ [nameProperty.id]: newRowName || "Untitled" });
    setNewRowName("");
  }, [nameProperty, newRowName, onAddItem]);

  return (
    <div className="divide-y divide-border">
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        const name = nameProperty ? item.properties[nameProperty.id] : "Untitled";

        return (
          <div key={item.id}>
            {/* Compact row */}
            <div
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
              <span className="text-sm font-medium truncate flex-1">{name || "Untitled"}</span>

              {/* Secondary property badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {secondaryProps.slice(0, 3).map((prop) => {
                  const val = item.properties[prop.id];
                  if (val == null || val === "") return null;
                  if (prop.type === "select") {
                    const opt = prop.options?.find((o) => o.id === val);
                    return opt ? (
                      <Badge key={prop.id} variant="outline" style={{ borderColor: opt.color, color: opt.color }} className="text-[10px] font-normal">
                        {opt.label}
                      </Badge>
                    ) : null;
                  }
                  if (prop.type === "checkbox") {
                    return val ? (
                      <Badge key={prop.id} variant="secondary" className="text-[10px]">✓ {prop.name}</Badge>
                    ) : null;
                  }
                  return (
                    <span key={prop.id} className="text-xs text-muted-foreground">{String(val).slice(0, 20)}</span>
                  );
                })}
              </div>

              {editable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                >
                  ×
                </Button>
              )}
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-8 pb-3 space-y-1.5 bg-muted/10">
                {visibleProps.map((prop) => (
                  <div key={prop.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{prop.name}</span>
                    <div className="flex-1">
                      <InlineCell
                        property={prop}
                        value={item.properties[prop.id]}
                        editable={editable}
                        onChange={(val) => onUpdateItem(item.id, prop.id, val)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Add row */}
      {editable && (
        <div className="flex items-center gap-2 px-3 py-2">
          <PlusCircle className="h-4 w-4 text-muted-foreground" />
          <Input
            value={newRowName}
            onChange={(e) => setNewRowName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddRow(); }}
            placeholder="New item..."
            className="h-7 border-0 shadow-none bg-transparent text-sm flex-1 px-1"
          />
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleAddRow}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
});
