import { useCallback, useEffect, useRef } from "react";

interface ColumnResizeHandleProps {
  leftCol: HTMLElement;
  rightCol: HTMLElement;
  containerWidth: number;
  onResizeEnd: (leftPct: number, rightPct: number, leftIndex: number) => void;
  leftIndex: number;
}

const MIN_PCT = 20;

export default function ColumnResizeHandle({
  leftCol,
  rightCol,
  containerWidth,
  onResizeEnd,
  leftIndex,
}: ColumnResizeHandleProps) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startLeftW = useRef(0);
  const startRightW = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startX.current = e.clientX;
    startLeftW.current = leftCol.getBoundingClientRect().width;
    startRightW.current = rightCol.getBoundingClientRect().width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftCol, rightCol]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const totalW = startLeftW.current + startRightW.current;
      const minPx = (MIN_PCT / 100) * containerWidth;

      let newLeftW = startLeftW.current + delta;
      let newRightW = startRightW.current - delta;

      if (newLeftW < minPx) { newLeftW = minPx; newRightW = totalW - minPx; }
      if (newRightW < minPx) { newRightW = minPx; newLeftW = totalW - minPx; }

      leftCol.style.flex = `0 0 ${newLeftW}px`;
      rightCol.style.flex = `0 0 ${newRightW}px`;
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const leftW = leftCol.getBoundingClientRect().width;
      const rightW = rightCol.getBoundingClientRect().width;
      const total = leftW + rightW;
      const leftPct = Math.round((leftW / total) * 100);
      const rightPct = 100 - leftPct;
      onResizeEnd(leftPct, rightPct, leftIndex);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [leftCol, rightCol, containerWidth, onResizeEnd, leftIndex]);

  return (
    <div
      ref={handleRef}
      className="column-resize-handle"
      onMouseDown={onMouseDown}
      title="Drag to resize columns"
    >
      <div className="column-resize-handle-line" />
    </div>
  );
}
