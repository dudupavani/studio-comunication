// src/components/design-editor/hooks/useViewport.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";

type ArtboardSize = { width: number; height: number };

export function useViewport({
  containerRef,
  stageRef,
  artboard,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  stageRef: React.RefObject<Konva.Stage>;
  artboard: ArtboardSize;
}) {
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // medir container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const w = Math.max(320, el.clientWidth);
      const h = Math.max(360, el.clientHeight);
      setViewport({ width: w, height: h });
    };

    const ro = new ResizeObserver(compute);
    ro.observe(el);
    compute();
    return () => ro.disconnect();
  }, [containerRef]);

  // fit
  const fitScale = useMemo(() => {
    if (!artboard.width || !artboard.height) return 1;
    const s = Math.min(
      viewport.width / artboard.width,
      viewport.height / artboard.height
    );
    return s * 0.98;
  }, [viewport.width, viewport.height, artboard.width, artboard.height]);

  const applyCenterFromScale = (s: number) => {
    const x = (viewport.width - artboard.width * s) / 2;
    const y = (viewport.height - artboard.height * s) / 2;
    setScale(s);
    setStagePos({ x, y });
  };

  useEffect(() => {
    if (artboard.width && artboard.height) {
      applyCenterFromScale(fitScale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artboard.width, artboard.height, fitScale]);

  // pan com barra de espaço
  const isPanningRef = useRef(false);
  const spacePressedRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, stageX: 0, stageY: 0 });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = true;
        document.body.style.cursor = "grab";
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        if (!isPanningRef.current) document.body.style.cursor = "";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.body.style.cursor = "";
    };
  }, []);

  const onContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const allow = e.button === 1 || (e.button === 0 && spacePressedRef.current);
    if (!allow) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      stageX: stagePos.x,
      stageY: stagePos.y,
    };
    document.body.style.cursor = "grabbing";
    e.preventDefault();
  };

  const onContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setStagePos({
      x: panStartRef.current.stageX + dx,
      y: panStartRef.current.stageY + dy,
    });
  };

  const onContainerMouseUp = () => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    document.body.style.cursor = spacePressedRef.current ? "grab" : "";
  };

  // helper: Stage → espaço local (artboard)
  function stageToLocal(sx: number, sy: number) {
    return {
      x: (sx - stagePos.x) / scale,
      y: (sy - stagePos.y) / scale,
    };
  }

  return {
    viewport,
    scale,
    stagePos,
    fitScale,
    applyCenterFromScale,
    onContainerMouseDown,
    onContainerMouseMove,
    onContainerMouseUp,
    stageToLocal,
  };
}
