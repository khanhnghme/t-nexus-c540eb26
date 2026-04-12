import { useEffect, useRef, useCallback } from "react";
import { createRoot, Root } from "react-dom/client";
import ColumnResizeHandle from "./ColumnResizeHandle";
import AddColumnButton from "./AddColumnButton";

const MAX_COLUMNS = 4;

/**
 * Hook that observes the editor DOM for columnList elements and injects
 * resize handles between columns + an "Add Column" button.
 */
export function useColumnControls(
  editorContainerRef: React.RefObject<HTMLElement | null>,
  editable: boolean,
  onAddColumn?: (columnListEl: HTMLElement) => void,
) {
  const rootsRef = useRef<Root[]>([]);
  const wrappersRef = useRef<HTMLElement[]>([]);

  const cleanup = useCallback(() => {
    rootsRef.current.forEach((r) => r.unmount());
    rootsRef.current = [];
    wrappersRef.current.forEach((w) => w.remove());
    wrappersRef.current = [];
  }, []);

  useEffect(() => {
    if (!editable) return;
    const container = editorContainerRef.current;
    if (!container) return;

    const inject = () => {
      cleanup();

      const columnLists = container.querySelectorAll<HTMLElement>(".bn-column-list");
      columnLists.forEach((cl) => {
        // Make columnList position relative for absolute children
        cl.style.position = "relative";

        const columns = Array.from(cl.children).filter(
          (c) => c.classList.contains("bn-column") || (c as HTMLElement).dataset?.contentType === "column"
        ) as HTMLElement[];

        const containerWidth = cl.getBoundingClientRect().width;

        // Inject resize handles between adjacent columns
        for (let i = 0; i < columns.length - 1; i++) {
          const wrapper = document.createElement("div");
          wrapper.className = "column-resize-wrapper";
          // Position between col[i] and col[i+1]
          columns[i].after(wrapper);
          wrappersRef.current.push(wrapper);

          const root = createRoot(wrapper);
          rootsRef.current.push(root);
          root.render(
            <ColumnResizeHandle
              leftCol={columns[i]}
              rightCol={columns[i + 1]}
              containerWidth={containerWidth}
              leftIndex={i}
              onResizeEnd={() => {
                // After resize, re-inject to update positions
                requestAnimationFrame(() => inject());
              }}
            />
          );
        }

        // Inject Add Column button
        if (columns.length < MAX_COLUMNS && onAddColumn) {
          const btnWrapper = document.createElement("div");
          btnWrapper.className = "add-column-btn-wrapper";
          cl.appendChild(btnWrapper);
          wrappersRef.current.push(btnWrapper);

          const btnRoot = createRoot(btnWrapper);
          rootsRef.current.push(btnRoot);
          btnRoot.render(
            <AddColumnButton
              visible={true}
              onClick={() => onAddColumn(cl)}
            />
          );
        }
      });
    };

    // Initial injection after a short delay for editor to render
    const timer = setTimeout(inject, 300);

    // Observe DOM mutations to re-inject when blocks change
    const observer = new MutationObserver(() => {
      requestAnimationFrame(inject);
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      cleanup();
    };
  }, [editable, editorContainerRef, onAddColumn, cleanup]);
}
