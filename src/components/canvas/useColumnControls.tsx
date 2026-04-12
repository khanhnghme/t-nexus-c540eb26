import { useEffect, useRef, useCallback } from "react";
import { createRoot, Root } from "react-dom/client";
import ColumnResizeHandle from "./ColumnResizeHandle";
import AddColumnButton from "./AddColumnButton";
import RemoveColumnButton from "./RemoveColumnButton";

const MAX_COLUMNS = 4;
const MIN_COLUMNS = 2;
const THROTTLE_MS = 150;

/**
 * Hook that observes the editor DOM for columnList elements and injects
 * resize handles between columns, an "Add Column" button, and remove buttons.
 * Includes throttling and width persistence via data-width attributes.
 */
export function useColumnControls(
  editorContainerRef: React.RefObject<HTMLElement | null>,
  editable: boolean,
  onAddColumn?: (columnListEl: HTMLElement) => void,
  onRemoveColumn?: (columnListEl: HTMLElement, columnIndex: number) => void,
) {
  const rootsRef = useRef<Root[]>([]);
  const wrappersRef = useRef<HTMLElement[]>([]);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStructureRef = useRef<string>("");

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
      // Build a structure fingerprint to skip redundant re-injects
      const columnLists = container.querySelectorAll<HTMLElement>(".bn-column-list");
      const fingerprint = Array.from(columnLists)
        .map((cl) => {
          const cols = Array.from(cl.children).filter(
            (c) => c.classList.contains("bn-column") || (c as HTMLElement).dataset?.contentType === "column"
          );
          return cols.length;
        })
        .join(",");

      if (fingerprint === lastStructureRef.current && rootsRef.current.length > 0) {
        return; // Structure unchanged, skip re-inject
      }
      lastStructureRef.current = fingerprint;

      cleanup();

      columnLists.forEach((cl) => {
        cl.style.position = "relative";

        const columns = Array.from(cl.children).filter(
          (c) => c.classList.contains("bn-column") || (c as HTMLElement).dataset?.contentType === "column"
        ) as HTMLElement[];

        const containerWidth = cl.getBoundingClientRect().width;

        // Restore persisted widths from data-width attributes
        columns.forEach((col) => {
          const savedWidth = col.getAttribute("data-width");
          if (savedWidth) {
            col.style.flex = `0 0 ${savedWidth}%`;
          }
        });

        // Inject resize handles between adjacent columns
        for (let i = 0; i < columns.length - 1; i++) {
          const wrapper = document.createElement("div");
          wrapper.className = "column-resize-wrapper";
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
              onResizeEnd={(leftPct, rightPct, leftIdx) => {
                // Persist widths to data-width attributes
                columns[leftIdx].setAttribute("data-width", String(leftPct));
                columns[leftIdx + 1].setAttribute("data-width", String(rightPct));
                // Force structure change so next inject restores
                lastStructureRef.current = "";
                requestAnimationFrame(() => inject());
              }}
            />
          );
        }

        // Inject Remove Column buttons (only if > MIN_COLUMNS)
        if (columns.length > MIN_COLUMNS && onRemoveColumn) {
          columns.forEach((col, idx) => {
            const btnWrapper = document.createElement("div");
            btnWrapper.className = "remove-column-btn-wrapper";
            col.style.position = "relative";
            col.appendChild(btnWrapper);
            wrappersRef.current.push(btnWrapper);

            const btnRoot = createRoot(btnWrapper);
            rootsRef.current.push(btnRoot);
            btnRoot.render(
              <RemoveColumnButton onClick={() => onRemoveColumn(cl, idx)} />
            );
          });
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
            <AddColumnButton visible={true} onClick={() => onAddColumn(cl)} />
          );
        }
      });
    };

    // Initial injection after a short delay for editor to render
    const timer = setTimeout(inject, 300);

    // Throttled observer callback
    const throttledInject = () => {
      if (throttleTimerRef.current) return;
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
        inject();
      }, THROTTLE_MS);
    };

    const observer = new MutationObserver(throttledInject);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      observer.disconnect();
      cleanup();
    };
  }, [editable, editorContainerRef, onAddColumn, onRemoveColumn, cleanup]);
}
