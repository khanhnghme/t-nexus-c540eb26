import { memo, useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineCell } from "./InlineCell";
import type { DatabaseItem, PropertyDef } from "../types";

interface CalendarViewProps {
  items: DatabaseItem[];
  properties: PropertyDef[];
  visiblePropertyIds: string[];
  editable: boolean;
  onUpdateItem: (id: string, propertyId: string, value: any) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (defaults?: Record<string, any>) => void;
  datePropertyId?: string;
  onSetDateProperty?: (propertyId: string) => void;
}

/* ── helpers ───────────────────────────────────────────── */

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildGrid(month: Date) {
  const first = startOfMonth(month);
  // Monday-based: 0=Mon … 6=Sun
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();

  const cells: { date: Date; key: string; inMonth: boolean }[] = [];

  // leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - i - 1);
    cells.push({ date: d, key: toKey(d), inMonth: false });
  }

  // current month
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(month.getFullYear(), month.getMonth(), day);
    cells.push({ date: d, key: toKey(d), inMonth: true });
  }

  // trailing to fill 6 rows (42 cells)
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, key: toKey(d), inMonth: false });
  }

  return cells;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── Component ─────────────────────────────────────────── */

export const CalendarView = memo(function CalendarView({
  items,
  properties,
  visiblePropertyIds,
  editable,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  datePropertyId,
  onSetDateProperty,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const dateProp = properties.find(
    (p) => p.id === datePropertyId && p.type === "date"
  );
  const dateProps = properties.filter((p) => p.type === "date");

  /* No date property selected */
  if (!dateProp) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Select a date property to display on the calendar
        </p>
        {dateProps.length > 0 ? (
          <Select onValueChange={(v) => onSetDateProperty?.(v)}>
            <SelectTrigger className="w-48 mx-auto">
              <SelectValue placeholder="Choose property" />
            </SelectTrigger>
            <SelectContent>
              {dateProps.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add a date property first.
          </p>
        )}
      </div>
    );
  }

  /* Group items by date key */
  const itemsByDate = useMemo(() => {
    const map = new Map<string, DatabaseItem[]>();
    for (const item of items) {
      const raw = item.properties[dateProp.id];
      if (!raw) continue;
      const key = String(raw).slice(0, 10); // YYYY-MM-DD
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items, dateProp.id]);

  const cells = useMemo(() => buildGrid(currentMonth), [currentMonth]);

  const nameProperty = properties.find((p) => p.type === "text");

  const prevMonth = useCallback(
    () =>
      setCurrentMonth(
        (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
      ),
    []
  );
  const nextMonth = useCallback(
    () =>
      setCurrentMonth(
        (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
      ),
    []
  );
  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  const todayKey = toKey(new Date());
  const MAX_PILLS = 2;

  return (
    <div className="p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToday}>
          Today
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 border-t border-l border-border">
        {cells.map((cell) => {
          const dayItems = itemsByDate.get(cell.key) ?? [];
          const isToday = cell.key === todayKey;
          const overflow = dayItems.length - MAX_PILLS;

          return (
            <div
              key={cell.key}
              className={`
                border-r border-b border-border min-h-[80px] p-1 text-xs
                ${cell.inMonth ? "bg-card" : "bg-muted/30"}
                ${editable ? "cursor-pointer" : ""}
              `}
              onClick={() => {
                if (editable && dayItems.length === 0) {
                  onAddItem({ [dateProp.id]: cell.key });
                }
              }}
            >
              {/* Date number */}
              <div
                className={`
                  text-[11px] font-medium mb-0.5
                  ${isToday ? "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center" : ""}
                  ${!cell.inMonth ? "text-muted-foreground/50" : "text-foreground"}
                `}
              >
                {cell.date.getDate()}
              </div>

              {/* Item pills */}
              <div className="space-y-0.5">
                {dayItems.slice(0, MAX_PILLS).map((item) => (
                  <ItemPill
                    key={item.id}
                    item={item}
                    properties={properties}
                    nameProperty={nameProperty}
                    editable={editable}
                    onUpdateItem={onUpdateItem}
                    onDeleteItem={onDeleteItem}
                  />
                ))}
                {overflow > 0 && (
                  <div className="text-[10px] text-muted-foreground pl-1">
                    +{overflow} more
                  </div>
                )}
              </div>

              {/* Add button for cells with items */}
              {editable && dayItems.length > 0 && (
                <button
                  className="mt-0.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddItem({ [dateProp.id]: cell.key });
                  }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ── Item Pill with Popover ────────────────────────────── */

interface ItemPillProps {
  item: DatabaseItem;
  properties: PropertyDef[];
  nameProperty?: PropertyDef;
  editable: boolean;
  onUpdateItem: (id: string, propertyId: string, value: any) => void;
  onDeleteItem: (id: string) => void;
}

const ItemPill = memo(function ItemPill({
  item,
  properties,
  nameProperty,
  editable,
  onUpdateItem,
  onDeleteItem,
}: ItemPillProps) {
  const label = nameProperty
    ? String(item.properties[nameProperty.id] ?? "")
    : "Untitled";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-full text-left truncate rounded px-1 py-0.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {label || "Untitled"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-2" align="start">
        {properties.map((prop) => (
          <div key={prop.id} className="space-y-0.5">
            <label className="text-[10px] font-medium text-muted-foreground">
              {prop.name}
            </label>
            <InlineCell
              property={prop}
              value={item.properties[prop.id]}
              editable={editable}
              onChange={(v) => onUpdateItem(item.id, prop.id, v)}
            />
          </div>
        ))}
        {editable && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive hover:text-destructive h-7 text-xs mt-1"
            onClick={() => onDeleteItem(item.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
});
