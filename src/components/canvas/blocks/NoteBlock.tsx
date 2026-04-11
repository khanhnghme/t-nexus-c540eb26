import { createReactBlockSpec } from "@blocknote/react";

const NOTE_COLORS: Record<string, { bg: string; border: string }> = {
  "#f0f9ff": { bg: "#f0f9ff", border: "#bae6fd" },
  "#fefce8": { bg: "#fefce8", border: "#fde68a" },
  "#f0fdf4": { bg: "#f0fdf4", border: "#bbf7d0" },
  "#fff1f2": { bg: "#fff1f2", border: "#fecdd3" },
  "#faf5ff": { bg: "#faf5ff", border: "#e9d5ff" },
  "#f9fafb": { bg: "#f9fafb", border: "#e5e7eb" },
};

export const NoteCalloutBlock = createReactBlockSpec(
  {
    type: "noteCallout" as const,
    propSchema: {
      icon: { default: "💡" },
      color: { default: "#f0f9ff" },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const icon = props.block.props.icon || "💡";
      const color = props.block.props.color || "#f0f9ff";
      const style = NOTE_COLORS[color] || NOTE_COLORS["#f0f9ff"];

      return (
        <div
          style={{
            backgroundColor: style.bg,
            borderLeft: `4px solid ${style.border}`,
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            margin: "0.25rem 0",
          }}
        >
          <span
            style={{
              fontSize: "1.25rem",
              lineHeight: "1.5rem",
              flexShrink: 0,
              userSelect: "none",
            }}
            contentEditable={false}
          >
            {icon}
          </span>
          <div
            style={{ flex: 1, minWidth: 0 }}
            ref={props.contentRef}
          />
        </div>
      );
    },
  }
);
