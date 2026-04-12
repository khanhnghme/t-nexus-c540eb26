// ── Property Types ──────────────────────────────────────────────

export type PropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "checkbox"
  | "url"
  | "person";

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export interface PropertyDef {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[];
}

// ── Database Item ───────────────────────────────────────────────

export interface DatabaseItem {
  id: string;
  properties: Record<string, any>;
  createdAt: string;
}

// ── View Types ──────────────────────────────────────────────────

export type ViewType = "table" | "board" | "calendar" | "list";

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty"
  | "gt"
  | "lt";

export interface FilterRule {
  propertyId: string;
  operator: FilterOperator;
  value: any;
}

export interface SortRule {
  propertyId: string;
  direction: "asc" | "desc";
}

export interface ViewConfig {
  id: string;
  name: string;
  type: ViewType;
  filters: FilterRule[];
  sorts: SortRule[];
  groupBy?: string;
  dateProperty?: string;
  visibleProperties: string[];
}

// ── Block Props (JSON-stringified in BlockNote) ─────────────────

export interface DatabaseBlockData {
  properties: PropertyDef[];
  items: DatabaseItem[];
  views: ViewConfig[];
  activeViewId: string;
}

// ── Helpers ─────────────────────────────────────────────────────

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  );
}

const DEFAULT_STATUS_OPTIONS: SelectOption[] = [
  { id: "opt_todo", label: "Todo", color: "#94a3b8" },
  { id: "opt_in_progress", label: "In Progress", color: "#f59e0b" },
  { id: "opt_done", label: "Done", color: "#22c55e" },
];

export function createDefaultProperties(): PropertyDef[] {
  return [
    { id: generateId(), name: "Name", type: "text" },
    {
      id: generateId(),
      name: "Status",
      type: "select",
      options: DEFAULT_STATUS_OPTIONS,
    },
  ];
}

export function createDefaultView(
  name: string,
  type: ViewType,
  propertyIds: string[]
): ViewConfig {
  return {
    id: generateId(),
    name,
    type,
    filters: [],
    sorts: [],
    visibleProperties: [...propertyIds],
    ...(type === "board" ? { groupBy: undefined } : {}),
    ...(type === "calendar" ? { dateProperty: undefined } : {}),
  };
}

export function createDefaultDatabase(): DatabaseBlockData {
  const properties = createDefaultProperties();
  const propertyIds = properties.map((p) => p.id);
  const defaultView = createDefaultView("Table", "table", propertyIds);
  return {
    properties,
    items: [],
    views: [defaultView],
    activeViewId: defaultView.id,
  };
}

// ── Filter / Sort Pure Functions ────────────────────────────────

function matchFilter(
  item: DatabaseItem,
  rule: FilterRule,
  propDef: PropertyDef | undefined
): boolean {
  const val = item.properties[rule.propertyId];
  const { operator, value: filterVal } = rule;

  if (operator === "is_empty") {
    return val == null || val === "" || (Array.isArray(val) && val.length === 0);
  }
  if (operator === "is_not_empty") {
    return val != null && val !== "" && !(Array.isArray(val) && val.length === 0);
  }

  const type = propDef?.type ?? "text";

  switch (operator) {
    case "equals":
      if (type === "checkbox") return Boolean(val) === Boolean(filterVal);
      return String(val ?? "") === String(filterVal ?? "");
    case "not_equals":
      return String(val ?? "") !== String(filterVal ?? "");
    case "contains":
      return String(val ?? "")
        .toLowerCase()
        .includes(String(filterVal ?? "").toLowerCase());
    case "not_contains":
      return !String(val ?? "")
        .toLowerCase()
        .includes(String(filterVal ?? "").toLowerCase());
    case "gt":
      return Number(val) > Number(filterVal);
    case "lt":
      return Number(val) < Number(filterVal);
    default:
      return true;
  }
}

export function applyFilters(
  items: DatabaseItem[],
  filters: FilterRule[],
  properties: PropertyDef[]
): DatabaseItem[] {
  if (filters.length === 0) return items;
  const propMap = new Map(properties.map((p) => [p.id, p]));
  return items.filter((item) =>
    filters.every((f) => matchFilter(item, f, propMap.get(f.propertyId)))
  );
}

export function applySorts(
  items: DatabaseItem[],
  sorts: SortRule[],
  properties: PropertyDef[]
): DatabaseItem[] {
  if (sorts.length === 0) return items;
  const propMap = new Map(properties.map((p) => [p.id, p]));
  const sorted = [...items];
  sorted.sort((a, b) => {
    for (const sort of sorts) {
      const type = propMap.get(sort.propertyId)?.type ?? "text";
      const aVal = a.properties[sort.propertyId];
      const bVal = b.properties[sort.propertyId];
      let cmp = 0;

      if (type === "number") {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      } else if (type === "date") {
        cmp =
          new Date(aVal ?? 0).getTime() - new Date(bVal ?? 0).getTime();
      } else {
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
      }

      if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

export function applyFiltersAndSorts(
  items: DatabaseItem[],
  view: ViewConfig | undefined,
  properties: PropertyDef[]
): DatabaseItem[] {
  if (!view) return items;
  const filtered = applyFilters(items, view.filters, properties);
  return applySorts(filtered, view.sorts, properties);
}
