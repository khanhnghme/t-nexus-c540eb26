import { createReactBlockSpec } from "@blocknote/react";
import { memo, useCallback, useState } from "react";
import { Database, Plus, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useDatabaseData } from "./useDatabaseData";
import { ViewSwitcher } from "./ViewSwitcher";
import { ViewToolbar } from "./ViewToolbar";
import type { PropertyDef } from "./types";

/* ── Inline Cell Renderer ─────────────────────────────────────── */

interface CellProps {
  property: PropertyDef;
  value: any;
  editable: boolean;
  onChange: (value: any) => void;
}

const InlineCell = memo(function InlineCell({ property, value, editable, onChange }: CellProps) {
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

    default: // text, person, multi_select fallback
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

/* ── Database Renderer ────────────────────────────────────────── */

interface DatabaseRendererProps {
  blockProps: {
    properties?: string;
    items?: string;
    views?: string;
    activeViewId?: string;
  };
  editable: boolean;
  updateProps: (updates: Record<string, string>) => void;
}

const DatabaseRenderer = memo(function DatabaseRenderer({
  blockProps,
  editable,
  updateProps,
}: DatabaseRendererProps) {
  const db = useDatabaseData({ blockProps, updateProps });
  const {
    properties, filteredItems, activeView, views, activeViewId,
    addItem, updateItem, deleteItem, addProperty,
    addView, updateView, deleteView, setActiveView,
  } = db;

  const visibleProps = activeView
    ? properties.filter((p) => activeView.visibleProperties.includes(p.id))
    : properties;

  const [newRowName, setNewRowName] = useState("");

  const handleAddRow = useCallback(() => {
    const nameProperty = properties[0];
    if (!nameProperty) return;
    addItem({ [nameProperty.id]: newRowName || "Untitled" });
    setNewRowName("");
  }, [properties, newRowName, addItem]);

  const handleRenameView = useCallback(
    (viewId: string, name: string) => updateView(viewId, { name }),
    [updateView]
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header with ViewSwitcher */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
        <Database className="h-4 w-4 text-muted-foreground shrink-0" />
        <ViewSwitcher
          views={views}
          activeViewId={activeViewId}
          editable={editable}
          onSwitchView={setActiveView}
          onAddView={addView}
          onDeleteView={deleteView}
          onRenameView={handleRenameView}
        />
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {filteredItems.length} items
        </span>
      </div>

      {/* ViewToolbar */}
      {activeView && (
        <div className="px-3 py-1 border-b border-border bg-muted/10">
          <ViewToolbar
            view={activeView}
            properties={properties}
            editable={editable}
            onUpdateView={updateView}
          />
        </div>
      )}

      {/* Table */}
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
                    onClick={() => addProperty("Column", "text")}
                    title="Add column"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
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
                      onChange={(val) => updateItem(item.id, prop.id, val)}
                    />
                  </td>
                ))}
                {editable && (
                  <td className="px-2 py-1 w-8">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteItem(item.id)}
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

      {/* Add row */}
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
    </div>
  );
});

/* ── Block Spec ───────────────────────────────────────────────── */

export const DatabaseViewBlock = createReactBlockSpec(
  {
    type: "databaseView" as const,
    propSchema: {
      properties: { default: "" },
      items: { default: "" },
      views: { default: "" },
      activeViewId: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const blockProps = {
        properties: (props.block.props as any).properties ?? "",
        items: (props.block.props as any).items ?? "",
        views: (props.block.props as any).views ?? "",
        activeViewId: (props.block.props as any).activeViewId ?? "",
      };

      const updateProps = (updates: Record<string, string>) => {
        (props as any).editor.updateBlock(props.block, { props: updates });
      };

      return (
        <div className="my-3" contentEditable={false}>
          <DatabaseRenderer
            blockProps={blockProps}
            editable={(props as any).editor.isEditable}
            updateProps={updateProps}
          />
        </div>
      );
    },
  }
);
