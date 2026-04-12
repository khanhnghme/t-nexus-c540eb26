import { memo, useCallback, useState } from "react";
import { Plus, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineCell } from "./InlineCell";
import type { PropertyDef, DatabaseItem } from "../types";

interface TableViewProps {
  items: DatabaseItem[];
  properties: PropertyDef[];
  visiblePropertyIds: string[];
  editable: boolean;
  onUpdateItem: (itemId: string, propertyId: string, value: any) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (properties: Record<string, any>) => void;
  onAddProperty: (name: string, type: string) => void;
}

export const TableView = memo(function TableView({
  items, properties, visiblePropertyIds, editable,
  onUpdateItem, onDeleteItem, onAddItem, onAddProperty,
}: TableViewProps) {
  const visibleProps = properties.filter((p) => visiblePropertyIds.includes(p.id));
  const [newRowName, setNewRowName] = useState("");

  const handleAddRow = useCallback(() => {
    const nameProperty = properties[0];
    if (!nameProperty) return;
    onAddItem({ [nameProperty.id]: newRowName || "Untitled" });
    setNewRowName("");
  }, [properties, newRowName, onAddItem]);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {visibleProps.map((prop) => (
                <th
                  key={prop.id}
                  className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {prop.name}
                </th>
              ))}
              {editable && (
                <th className="px-2 py-1.5 w-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onAddProperty("Column", "text")}
                    title="Add column"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                {visibleProps.map((prop) => (
                  <td key={prop.id} className="px-3 py-1 min-w-[120px]">
                    <InlineCell
                      property={prop}
                      value={item.properties[prop.id]}
                      editable={editable}
                      onChange={(val) => onUpdateItem(item.id, prop.id, val)}
                    />
                  </td>
                ))}
                {editable && (
                  <td className="px-2 py-1 w-8">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteItem(item.id)}
                    >
                      ×
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
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
    </>
  );
});
