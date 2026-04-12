import { memo, useCallback, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DatabaseItem, PropertyDef } from "../types";

interface BoardViewProps {
  items: DatabaseItem[];
  properties: PropertyDef[];
  visiblePropertyIds: string[];
  editable: boolean;
  onUpdateItem: (itemId: string, propertyId: string, value: any) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (initialValues?: Record<string, any>) => DatabaseItem;
  groupByPropertyId?: string;
  onSetGroupBy?: (propertyId: string) => void;
}

const NO_STATUS_KEY = "__no_status__";

export const BoardView = memo(function BoardView({
  items,
  properties,
  editable,
  onUpdateItem,
  onAddItem,
  groupByPropertyId,
  onSetGroupBy,
}: BoardViewProps) {
  const groupProp = useMemo(
    () => properties.find((p) => p.id === groupByPropertyId && p.type === "select"),
    [properties, groupByPropertyId]
  );

  const selectProperties = useMemo(
    () => properties.filter((p) => p.type === "select"),
    [properties]
  );

  const nameProperty = useMemo(() => properties[0], [properties]);

  const options = groupProp?.options ?? [];

  // Group items into columns
  const columns = useMemo(() => {
    if (!groupProp) return {};
    const map: Record<string, DatabaseItem[]> = {};
    map[NO_STATUS_KEY] = [];
    for (const opt of options) map[opt.id] = [];

    for (const item of items) {
      const val = item.properties[groupProp.id];
      if (val && map[val]) {
        map[val].push(item);
      } else {
        map[NO_STATUS_KEY].push(item);
      }
    }
    return map;
  }, [items, options, groupProp]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!groupProp || !result.destination || !editable) return;
      const itemId = result.draggableId;
      const destCol = result.destination.droppableId;
      const newValue = destCol === NO_STATUS_KEY ? null : destCol;
      onUpdateItem(itemId, groupProp.id, newValue);
    },
    [editable, onUpdateItem, groupProp]
  );

  // If no valid groupBy, show picker
  if (!groupProp) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <p>Select a property to group by</p>
        {selectProperties.length > 0 ? (
          <Select onValueChange={(v) => onSetGroupBy?.(v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Choose property" />
            </SelectTrigger>
            <SelectContent>
              {selectProperties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs">No select-type properties available. Add one first.</p>
        )}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 p-3 overflow-x-auto min-h-[200px]">
        {/* No Status column */}
        {columns[NO_STATUS_KEY].length > 0 && (
          <BoardColumn
            columnId={NO_STATUS_KEY}
            label="No Status"
            color="#94a3b8"
            items={columns[NO_STATUS_KEY]}
            namePropertyId={nameProperty?.id}
            groupPropertyId={groupProp.id}
            editable={editable}
            onAddItem={onAddItem}
            properties={properties}
          />
        )}
        {options.map((opt) => (
          <BoardColumn
            key={opt.id}
            columnId={opt.id}
            label={opt.label}
            color={opt.color}
            items={columns[opt.id] ?? []}
            namePropertyId={nameProperty?.id}
            groupPropertyId={groupProp.id}
            editable={editable}
            onAddItem={onAddItem}
            properties={properties}
          />
        ))}
      </div>
    </DragDropContext>
  );
});

/* ── Column ─────────────────────────────────────────────── */

interface BoardColumnProps {
  columnId: string;
  label: string;
  color: string;
  items: DatabaseItem[];
  namePropertyId?: string;
  groupPropertyId: string;
  editable: boolean;
  onAddItem: (initialValues?: Record<string, any>) => DatabaseItem;
  properties: PropertyDef[];
}

const BoardColumn = memo(function BoardColumn({
  columnId,
  label,
  color,
  items,
  namePropertyId,
  groupPropertyId,
  editable,
  onAddItem,
  properties,
}: BoardColumnProps) {
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const init: Record<string, any> = {};
    if (namePropertyId) init[namePropertyId] = trimmed;
    if (columnId !== NO_STATUS_KEY) init[groupPropertyId] = columnId;
    onAddItem(init);
    setNewName("");
  };

  return (
    <div className="flex flex-col min-w-[220px] max-w-[280px] w-[260px] shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium truncate">{label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
          {items.length}
        </Badge>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 flex flex-col gap-1.5 p-1 rounded-md min-h-[60px] transition-colors ${
              snapshot.isDraggingOver ? "bg-accent/40" : "bg-muted/30"
            }`}
          >
            {items.map((item, idx) => (
              <Draggable
                key={item.id}
                draggableId={item.id}
                index={idx}
                isDragDisabled={!editable}
              >
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`rounded-md border bg-card px-2.5 py-2 text-sm shadow-sm ${
                      dragSnapshot.isDragging ? "shadow-md ring-1 ring-primary/20" : ""
                    }`}
                  >
                    <p className="font-medium text-xs truncate">
                      {namePropertyId
                        ? (item.properties[namePropertyId] as string) || "Untitled"
                        : "Untitled"}
                    </p>
                    {/* Secondary badges */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {properties
                        .filter(
                          (p) =>
                            p.id !== namePropertyId &&
                            p.id !== groupPropertyId &&
                            p.type === "select" &&
                            item.properties[p.id]
                        )
                        .slice(0, 3)
                        .map((p) => {
                          const opt = p.options?.find(
                            (o) => o.id === item.properties[p.id]
                          );
                          return opt ? (
                            <span
                              key={p.id}
                              className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: opt.color }}
                            >
                              {opt.label}
                            </span>
                          ) : null;
                        })}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add card */}
      {editable && (
        <div className="flex gap-1 mt-1.5 px-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New item..."
            className="h-7 text-xs"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
});
