import { createReactBlockSpec } from "@blocknote/react";
import { memo, useCallback, useState } from "react";
import { Database } from "lucide-react";
import { useDatabaseData } from "./useDatabaseData";
import { ViewSwitcher } from "./ViewSwitcher";
import { ViewToolbar } from "./ViewToolbar";
import { TableView } from "./views/TableView";
import { ListView } from "./views/ListView";
import { BoardView } from "./views/BoardView";
import { CalendarView } from "./views/CalendarView";
import { DatabaseTemplatePicker } from "./DatabaseTemplatePicker";
import type { DatabaseBlockData } from "./types";

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
  const isInitialized = blockProps.properties && blockProps.properties !== "";

  const handleTemplateSelect = useCallback(
    (data: DatabaseBlockData) => {
      updateProps({
        properties: JSON.stringify(data.properties),
        items: JSON.stringify(data.items),
        views: JSON.stringify(data.views),
        activeViewId: data.activeViewId,
      });
    },
    [updateProps]
  );

  const db = useDatabaseData({ blockProps, updateProps });
  const {
    properties, filteredItems, activeView, views, activeViewId,
    addItem, updateItem, deleteItem, addProperty,
    addView, updateView, deleteView, setActiveView,
  } = db;

  if (!isInitialized) {
    return (
      <DatabaseTemplatePicker onSelect={handleTemplateSelect} />
    );
  }

  const visiblePropertyIds = activeView
    ? activeView.visibleProperties
    : properties.map((p) => p.id);

  const handleRenameView = useCallback(
    (viewId: string, name: string) => updateView(viewId, { name }),
    [updateView]
  );

  const handleSetGroupBy = useCallback(
    (propertyId: string) => {
      if (activeView) updateView(activeView.id, { groupBy: propertyId });
    },
    [activeView, updateView]
  );

  const handleSetDateProperty = useCallback(
    (propertyId: string) => {
      if (activeView) updateView(activeView.id, { dateProperty: propertyId });
    },
    [activeView, updateView]
  );

  /* ── View Router ──────────────────────────────────────── */
  const renderActiveView = () => {
    const commonProps = {
      items: filteredItems,
      properties,
      visiblePropertyIds,
      editable,
      onUpdateItem: updateItem,
      onDeleteItem: deleteItem,
      onAddItem: addItem,
    };

    switch (activeView?.type) {
      case "list":
        return <ListView {...commonProps} />;
      case "board":
        return (
          <BoardView
            {...commonProps}
            groupByPropertyId={activeView?.groupBy}
            onSetGroupBy={handleSetGroupBy}
          />
        );
      case "calendar":
        return (
          <CalendarView
            {...commonProps}
            datePropertyId={activeView?.dateProperty}
            onSetDateProperty={handleSetDateProperty}
          />
        );
      case "table":
      default:
        return <TableView {...commonProps} onAddProperty={addProperty} />;
    }
  };

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

      {/* Active View */}
      {renderActiveView()}
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
