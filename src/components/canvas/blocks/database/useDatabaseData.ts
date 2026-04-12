import { useCallback, useMemo, useRef } from "react";
import {
  type DatabaseBlockData,
  type DatabaseItem,
  type PropertyDef,
  type PropertyType,
  type ViewConfig,
  type ViewType,
  applyFiltersAndSorts,
  createDefaultDatabase,
  createDefaultView,
  generateId,
} from "./types";

// ── JSON parse helpers ──────────────────────────────────────────

function safeParse<T>(json: string | undefined | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ── Hook ────────────────────────────────────────────────────────

interface UseDatabaseDataInput {
  blockProps: {
    properties?: string;
    items?: string;
    views?: string;
    activeViewId?: string;
  };
  updateProps: (updates: Record<string, string>) => void;
}

export function useDatabaseData({ blockProps, updateProps }: UseDatabaseDataInput) {
  const defaults = useRef(createDefaultDatabase());

  // ── Parse ───────────────────────────────────────────────────
  const properties: PropertyDef[] = useMemo(
    () => safeParse(blockProps.properties, defaults.current.properties),
    [blockProps.properties]
  );

  const items: DatabaseItem[] = useMemo(
    () => safeParse(blockProps.items, defaults.current.items),
    [blockProps.items]
  );

  const views: ViewConfig[] = useMemo(
    () => safeParse(blockProps.views, defaults.current.views),
    [blockProps.views]
  );

  const activeViewId = blockProps.activeViewId || defaults.current.activeViewId;

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) ?? views[0],
    [views, activeViewId]
  );

  const filteredItems = useMemo(
    () => applyFiltersAndSorts(items, activeView, properties),
    [items, activeView, properties]
  );

  // ── Throttled update helper ─────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttledUpdate = useCallback(
    (updates: Record<string, string>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        updateProps(updates);
        timerRef.current = null;
      }, 100);
    },
    [updateProps]
  );

  const immediateUpdate = useCallback(
    (updates: Record<string, string>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      updateProps(updates);
    },
    [updateProps]
  );

  // ── Item CRUD ───────────────────────────────────────────────

  const addItem = useCallback(
    (initialValues?: Record<string, any>) => {
      const newItem: DatabaseItem = {
        id: generateId(),
        properties: initialValues ?? {},
        createdAt: new Date().toISOString(),
      };
      const next = [...items, newItem];
      immediateUpdate({ items: JSON.stringify(next) });
      return newItem;
    },
    [items, immediateUpdate]
  );

  const updateItem = useCallback(
    (itemId: string, propertyId: string, value: any) => {
      const next = items.map((it) =>
        it.id === itemId
          ? { ...it, properties: { ...it.properties, [propertyId]: value } }
          : it
      );
      throttledUpdate({ items: JSON.stringify(next) });
    },
    [items, throttledUpdate]
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      const next = items.filter((it) => it.id !== itemId);
      immediateUpdate({ items: JSON.stringify(next) });
    },
    [items, immediateUpdate]
  );

  // ── Property CRUD ─────────────────────────────────────────

  const addProperty = useCallback(
    (name: string, type: PropertyType) => {
      const newProp: PropertyDef = { id: generateId(), name, type };
      if (type === "select" || type === "multi_select") {
        newProp.options = [];
      }
      const nextProps = [...properties, newProp];
      // Add to all views' visibleProperties
      const nextViews = views.map((v) => ({
        ...v,
        visibleProperties: [...v.visibleProperties, newProp.id],
      }));
      immediateUpdate({
        properties: JSON.stringify(nextProps),
        views: JSON.stringify(nextViews),
      });
      return newProp;
    },
    [properties, views, immediateUpdate]
  );

  const updateProperty = useCallback(
    (propertyId: string, updates: Partial<PropertyDef>) => {
      const nextProps = properties.map((p) =>
        p.id === propertyId ? { ...p, ...updates } : p
      );
      immediateUpdate({ properties: JSON.stringify(nextProps) });
    },
    [properties, immediateUpdate]
  );

  const deleteProperty = useCallback(
    (propertyId: string) => {
      const nextProps = properties.filter((p) => p.id !== propertyId);
      // Clean up items
      const nextItems = items.map((it) => {
        const { [propertyId]: _, ...rest } = it.properties;
        return { ...it, properties: rest };
      });
      // Clean up views
      const nextViews = views.map((v) => ({
        ...v,
        visibleProperties: v.visibleProperties.filter((id) => id !== propertyId),
        filters: v.filters.filter((f) => f.propertyId !== propertyId),
        sorts: v.sorts.filter((s) => s.propertyId !== propertyId),
        ...(v.groupBy === propertyId ? { groupBy: undefined } : {}),
        ...(v.dateProperty === propertyId ? { dateProperty: undefined } : {}),
      }));
      immediateUpdate({
        properties: JSON.stringify(nextProps),
        items: JSON.stringify(nextItems),
        views: JSON.stringify(nextViews),
      });
    },
    [properties, items, views, immediateUpdate]
  );

  // ── View Management ───────────────────────────────────────

  const addView = useCallback(
    (name: string, type: ViewType) => {
      const propIds = properties.map((p) => p.id);
      const newView = createDefaultView(name, type, propIds);
      const nextViews = [...views, newView];
      immediateUpdate({
        views: JSON.stringify(nextViews),
        activeViewId: newView.id,
      });
      return newView;
    },
    [properties, views, immediateUpdate]
  );

  const updateView = useCallback(
    (viewId: string, updates: Partial<ViewConfig>) => {
      const nextViews = views.map((v) =>
        v.id === viewId ? { ...v, ...updates } : v
      );
      immediateUpdate({ views: JSON.stringify(nextViews) });
    },
    [views, immediateUpdate]
  );

  const deleteView = useCallback(
    (viewId: string) => {
      if (views.length <= 1) return; // keep at least 1
      const nextViews = views.filter((v) => v.id !== viewId);
      const updates: Record<string, string> = {
        views: JSON.stringify(nextViews),
      };
      if (activeViewId === viewId) {
        updates.activeViewId = nextViews[0].id;
      }
      immediateUpdate(updates);
    },
    [views, activeViewId, immediateUpdate]
  );

  const setActiveView = useCallback(
    (viewId: string) => {
      immediateUpdate({ activeViewId: viewId });
    },
    [immediateUpdate]
  );

  return {
    // Data
    properties,
    items,
    views,
    activeViewId,
    activeView,
    filteredItems,
    // Item CRUD
    addItem,
    updateItem,
    deleteItem,
    // Property CRUD
    addProperty,
    updateProperty,
    deleteProperty,
    // View management
    addView,
    updateView,
    deleteView,
    setActiveView,
  };
}
