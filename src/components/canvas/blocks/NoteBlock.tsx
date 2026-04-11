import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";

const NOTE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  "#f0f9ff": { bg: "#f0f9ff", border: "#bae6fd", dot: "#93c5fd" },
  "#fefce8": { bg: "#fefce8", border: "#fde68a", dot: "#fbbf24" },
  "#f0fdf4": { bg: "#f0fdf4", border: "#bbf7d0", dot: "#4ade80" },
  "#fff1f2": { bg: "#fff1f2", border: "#fecdd3", dot: "#fb7185" },
  "#faf5ff": { bg: "#faf5ff", border: "#e9d5ff", dot: "#a78bfa" },
  "#f9fafb": { bg: "#f9fafb", border: "#e5e7eb", dot: "#9ca3af" },
};

const COLOR_KEYS = Object.keys(NOTE_COLORS);

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
      const [hovered, setHovered] = useState(false);
      const icon = props.block.props.icon || "💡";
      const color = props.block.props.color || "#f0f9ff";
      const style = NOTE_COLORS[color] || NOTE_COLORS["#f0f9ff"];

      return (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ position: "relative", margin: "0.25rem 0" }}
        >
          {hovered && (
            <div
              style={{
                position: "absolute",
                top: -28,
                left: 0,
                display: "flex",
                gap: 4,
                padding: "3px 6px",
                background: "#fff",
                borderRadius: 6,
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                zIndex: 10,
              }}
              contentEditable={false}
            >
              {COLOR_KEYS.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    (props.editor as any).updateBlock(props.block, {
                      props: { color: c },
                    })
                  }
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: NOTE_COLORS[c].dot,
                    border: c === color ? "2px solid #1e293b" : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                    outline: "none",
                  }}
                />
              ))}
            </div>
          )}
          <div
            style={{
              backgroundColor: style.bg,
              borderLeft: `4px solid ${style.border}`,
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
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
            <div style={{ flex: 1, minWidth: 0 }} ref={props.contentRef} />
          </div>
        </div>
      );
    },
  }
);
