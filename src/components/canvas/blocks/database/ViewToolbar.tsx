import { memo, useCallback } from "react";
import { Filter, ArrowUpDown, Columns3, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ViewConfig, PropertyDef, FilterRule, SortRule, FilterOperator } from "./types";
import { generateId } from "./types";

const OPERATORS_BY_TYPE: Record<string, { value: FilterOperator; label: string }[]> = {
  text: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "not contains" },
    { value: "equals", label: "equals" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "not_equals", label: "≠" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
    { value: "is_empty", label: "is empty" },
  ],
  select: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "is_empty", label: "is empty" },
  ],
  checkbox: [
    { value: "equals", label: "is" },
  ],
  date: [
    { value: "equals", label: "is" },
    { value: "gt", label: "after" },
    { value: "lt", label: "before" },
    { value: "is_empty", label: "is empty" },
  ],
  url: [
    { value: "contains", label: "contains" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
};

function getOperators(type: string) {
  return OPERATORS_BY_TYPE[type] ?? OPERATORS_BY_TYPE.text;
}

interface ViewToolbarProps {
  view: ViewConfig;
  properties: PropertyDef[];
  editable: boolean;
  onUpdateView: (viewId: string, updates: Partial<ViewConfig>) => void;
}

export const ViewToolbar = memo(function ViewToolbar({
  view,
  properties,
  editable,
  onUpdateView,
}: ViewToolbarProps) {
  const hiddenCount = properties.length - view.visibleProperties.length;

  const updateFilters = useCallback(
    (filters: FilterRule[]) => onUpdateView(view.id, { filters }),
    [view.id, onUpdateView]
  );

  const updateSorts = useCallback(
    (sorts: SortRule[]) => onUpdateView(view.id, { sorts }),
    [view.id, onUpdateView]
  );

  const toggleField = useCallback(
    (propId: string) => {
      const vis = view.visibleProperties.includes(propId)
        ? view.visibleProperties.filter((id) => id !== propId)
        : [...view.visibleProperties, propId];
      onUpdateView(view.id, { visibleProperties: vis });
    },
    [view, onUpdateView]
  );

  if (!editable) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            <Filter className="h-3.5 w-3.5" />
            Filter
            {view.filters.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                {view.filters.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-2">
            {view.filters.map((rule, idx) => {
              const prop = properties.find((p) => p.id === rule.propertyId);
              const ops = getOperators(prop?.type ?? "text");
              const needsValue = !["is_empty", "is_not_empty"].includes(rule.operator);

              return (
                <div key={idx} className="flex items-center gap-1.5">
                  <select
                    value={rule.propertyId}
                    onChange={(e) => {
                      const next = [...view.filters];
                      next[idx] = { ...next[idx], propertyId: e.target.value };
                      updateFilters(next);
                    }}
                    className="h-7 text-xs border rounded px-1 bg-background flex-1 min-w-0"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={rule.operator}
                    onChange={(e) => {
                      const next = [...view.filters];
                      next[idx] = { ...next[idx], operator: e.target.value as FilterOperator };
                      updateFilters(next);
                    }}
                    className="h-7 text-xs border rounded px-1 bg-background w-20"
                  >
                    {ops.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {needsValue && (
                    <Input
                      value={rule.value ?? ""}
                      onChange={(e) => {
                        const next = [...view.filters];
                        next[idx] = { ...next[idx], value: e.target.value };
                        updateFilters(next);
                      }}
                      className="h-7 text-xs flex-1 min-w-0 px-1.5"
                      placeholder="value"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => {
                      const next = view.filters.filter((_, i) => i !== idx);
                      updateFilters(next);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 w-full"
              onClick={() => {
                const firstProp = properties[0];
                if (!firstProp) return;
                updateFilters([
                  ...view.filters,
                  { propertyId: firstProp.id, operator: "contains", value: "" },
                ]);
              }}
            >
              <Plus className="h-3 w-3" />
              Add filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort
            {view.sorts.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                {view.sorts.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            {view.sorts.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <select
                  value={rule.propertyId}
                  onChange={(e) => {
                    const next = [...view.sorts];
                    next[idx] = { ...next[idx], propertyId: e.target.value };
                    updateSorts(next);
                  }}
                  className="h-7 text-xs border rounded px-1 bg-background flex-1 min-w-0"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2 w-16"
                  onClick={() => {
                    const next = [...view.sorts];
                    next[idx] = {
                      ...next[idx],
                      direction: next[idx].direction === "asc" ? "desc" : "asc",
                    };
                    updateSorts(next);
                  }}
                >
                  {rule.direction === "asc" ? "A→Z" : "Z→A"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    updateSorts(view.sorts.filter((_, i) => i !== idx));
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 w-full"
              onClick={() => {
                const firstProp = properties[0];
                if (!firstProp) return;
                updateSorts([
                  ...view.sorts,
                  { propertyId: firstProp.id, direction: "asc" },
                ]);
              }}
            >
              <Plus className="h-3 w-3" />
              Add sort
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Fields toggle */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            <Columns3 className="h-3.5 w-3.5" />
            Fields
            {hiddenCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                {hiddenCount} hidden
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {properties.map((prop) => (
              <label
                key={prop.id}
                className="flex items-center gap-2 px-1 py-0.5 text-xs cursor-pointer hover:bg-muted/50 rounded"
              >
                <Checkbox
                  checked={view.visibleProperties.includes(prop.id)}
                  onCheckedChange={() => toggleField(prop.id)}
                  className="h-3.5 w-3.5"
                />
                {prop.name}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
