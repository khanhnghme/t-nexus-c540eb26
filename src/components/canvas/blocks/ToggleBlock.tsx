import { createReactBlockSpec, type ReactCustomBlockRenderProps } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";
import { ChevronRight, ChevronDown } from "lucide-react";

const toggleBlockConfig = {
  type: "toggleBlock" as const,
  propSchema: {
    ...defaultProps,
    collapsed: { default: "true" as const },
  },
  content: "inline" as const,
};

function ToggleBlockComponent(
  props: ReactCustomBlockRenderProps<typeof toggleBlockConfig, any, any>
) {
  const isCollapsed = props.block.props.collapsed === "true";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.editor.updateBlock(props.block, {
      props: { collapsed: isCollapsed ? "false" : "true" },
    });
  };

  return (
    <div
      style={{
        border: "1px solid hsl(var(--border))",
        borderRadius: "0.5rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.625rem 0.75rem",
          cursor: "pointer",
        }}
      >
        <button
          onClick={handleToggle}
          contentEditable={false}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.25rem",
            height: "1.25rem",
            flexShrink: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            color: "hsl(var(--muted-foreground))",
          }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <div
          style={{ flex: 1, minWidth: 0, fontWeight: 500 }}
          ref={props.contentRef}
        />
      </div>
      {!isCollapsed && (
        <div
          contentEditable={false}
          style={{
            padding: "0.5rem 0.75rem 0.75rem 2.5rem",
            borderTop: "1px solid hsl(var(--border))",
            color: "hsl(var(--muted-foreground))",
            fontSize: "0.875rem",
          }}
        >
          Toggle content area
        </div>
      )}
    </div>
  );
}

export const ToggleBlock = () =>
  createReactBlockSpec(toggleBlockConfig, {
    render: (props) => <ToggleBlockComponent {...props} />,
  });
