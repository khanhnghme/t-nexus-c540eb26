import { useRef, useCallback, useState, useEffect } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { ChevronRight } from "lucide-react";

export const ToggleBlock = createReactBlockSpec(
  {
    type: "toggleBlock" as const,
    propSchema: {
      collapsed: { default: "true" as const },
      bodyText: { default: "" as const },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const isCollapsed = props.block.props.collapsed === "true";
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const bodyContainerRef = useRef<HTMLDivElement>(null);
      const [headerHovered, setHeaderHovered] = useState(false);
      const [maxHeight, setMaxHeight] = useState(isCollapsed ? "0px" : "500px");

      useEffect(() => {
        if (!isCollapsed) {
          const el = bodyContainerRef.current;
          setMaxHeight(el ? `${el.scrollHeight}px` : "500px");
        } else {
          setMaxHeight("0px");
        }
      }, [isCollapsed, props.block.props.bodyText]);

      const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        props.editor.updateBlock(props.block, {
          props: { collapsed: isCollapsed ? "false" : "true" },
        });
      };

      const autoResize = useCallback((el: HTMLTextAreaElement) => {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }, []);

      const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        props.editor.updateBlock(props.block, {
          props: { bodyText: e.target.value },
        });
        autoResize(e.target);
      };

      return (
        <div
          style={{
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            overflow: "hidden",
            background: "hsl(var(--muted) / 0.3)",
          }}
        >
          <div
            onMouseEnter={() => setHeaderHovered(true)}
            onMouseLeave={() => setHeaderHovered(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 0.75rem",
              cursor: "pointer",
              transition: "background 150ms ease",
              background: headerHovered ? "hsl(var(--muted) / 0.5)" : "transparent",
            }}
            onClick={handleToggle}
          >
            <span
              contentEditable={false}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.25rem",
                height: "1.25rem",
                flexShrink: 0,
                borderRadius: "0.25rem",
                color: "hsl(var(--muted-foreground))",
                transition: "background 150ms ease",
              }}
            >
              <ChevronRight
                size={16}
                style={{
                  transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                  transition: "transform 200ms ease",
                }}
              />
            </span>
            <div
              style={{ flex: 1, minWidth: 0, fontWeight: 500, lineHeight: "1.4" }}
              ref={props.contentRef}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div
            ref={bodyContainerRef}
            contentEditable={false}
            style={{
              maxHeight,
              opacity: isCollapsed ? 0 : 1,
              overflow: "hidden",
              transition: "max-height 200ms ease, opacity 150ms ease",
              borderTop: isCollapsed ? "none" : "1px solid hsl(var(--border))",
            }}
          >
            <div style={{ padding: "0.5rem 0.75rem 0.75rem 2.5rem" }}>
              <textarea
                ref={textareaRef}
                value={props.block.props.bodyText}
                onChange={handleBodyChange}
                placeholder="Nhập nội dung..."
                onFocus={(e) => autoResize(e.target)}
                rows={1}
                tabIndex={isCollapsed ? -1 : 0}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  background: "transparent",
                  color: "hsl(var(--muted-foreground))",
                  fontSize: "0.875rem",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                  fontFamily: "inherit",
                  padding: 0,
                  minHeight: "1.5rem",
                }}
              />
            </div>
          </div>
        </div>
      );
    },
  }
);
