"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Expand, Minimize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExpandableModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  showExpandToggle?: boolean;
  blockOutsideClose?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  expandedBodyClassName?: string;
  footerClassName?: string;
};

export function ExpandableModal({
  open,
  onOpenChange,
  header,
  headerActions,
  children,
  footer,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  showExpandToggle = true,
  blockOutsideClose = false,
  className,
  headerClassName,
  bodyClassName,
  expandedBodyClassName,
  footerClassName,
}: ExpandableModalProps) {
  const [internalExpanded, setInternalExpanded] =
    React.useState(defaultExpanded);

  const isExpanded = expanded ?? internalExpanded;

  const setExpanded = React.useCallback(
    (next: boolean) => {
      if (expanded === undefined) {
        setInternalExpanded(next);
      }
      onExpandedChange?.(next);
    },
    [expanded, onExpandedChange],
  );

  React.useEffect(() => {
    if (!open && expanded === undefined) {
      setInternalExpanded(defaultExpanded);
    }
  }, [defaultExpanded, expanded, open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />

        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={
            blockOutsideClose ? (event) => event.preventDefault() : undefined
          }
          onFocusOutside={
            blockOutsideClose ? (event) => event.preventDefault() : undefined
          }
          onPointerDownOutside={
            blockOutsideClose ? (event) => event.preventDefault() : undefined
          }
          onEscapeKeyDown={
            blockOutsideClose ? (event) => event.preventDefault() : undefined
          }
          className={cn(
            "fixed z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] border bg-background shadow-xl duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ",
            isExpanded
              ? "inset-0 h-screen w-screen rounded-none"
              : "left-1/2 top-1/2 h-[min(90vh,700px)] w-[min(800px,900px)] -translate-x-1/2 -translate-y-1/2 rounded-xl",
            className,
          )}>
          <div
            className={cn(
              "flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3",
              headerClassName,
            )}>
            <div className="min-w-0 flex-1">{header}</div>
            <div className="flex items-center gap-1">
              {headerActions ? headerActions : null}
              {showExpandToggle ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setExpanded(!isExpanded)}
                  aria-label={isExpanded ? "Recolher modal" : "Expandir modal"}>
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Expand className="h-4 w-4" />
                  )}
                </Button>
              ) : null}

              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Fechar modal">
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 overflow-auto px-4 py-4",
              bodyClassName,
              isExpanded && expandedBodyClassName,
            )}>
            {children}
          </div>

          {footer ? (
            <div className={cn("border-t px-4 py-3", footerClassName)}>
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
