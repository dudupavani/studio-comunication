"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type SidePanelProps = {
  renderTrigger: (options: {
    open: boolean;
    setOpen: (open: boolean) => void;
  }) => ReactNode;
  children: (close: () => void) => ReactNode;
  side?: "left" | "right";
  width?: number | string;
  overlayClassName?: string;
  panelClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

export function SidePanel({
  renderTrigger,
  children,
  side = "right",
  width = 360,
  overlayClassName,
  panelClassName,
  onOpenChange,
}: SidePanelProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const setOpenInternal = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : previous;
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, mounted]);

  const close = () => setOpenInternal(false);

  const widthValue = typeof width === "number" ? `${width}px` : width;

  const panel =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-50">
            <div
              className={cn("absolute inset-0 bg-black/40", overlayClassName)}
              onClick={close}
              aria-hidden="true"
            />
            <aside
              role="dialog"
              aria-modal="true"
              className={cn(
                "absolute inset-y-0 flex h-full flex-col bg-background shadow-xl",
                side === "right" ? "right-0" : "left-0",
                panelClassName
              )}
              style={{ width: widthValue }}
            >
              {children(close)}
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {renderTrigger({ open, setOpen: setOpenInternal })}
      {panel}
    </>
  );
}
