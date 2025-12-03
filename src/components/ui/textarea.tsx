import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & {
    autoResize?: boolean;
    minHeight?: number | string;
    maxHeight?: number | string;
  }
>(({ className, autoResize = false, minHeight, maxHeight, onChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const assignRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [ref]
  );

  const resize = React.useCallback(() => {
    if (!autoResize || !innerRef.current) return;
    const el = innerRef.current;
    el.style.height = "auto";
    if (minHeight) {
      el.style.minHeight = typeof minHeight === "number" ? `${minHeight}px` : String(minHeight);
    }
    if (maxHeight) {
      el.style.maxHeight = typeof maxHeight === "number" ? `${maxHeight}px` : String(maxHeight);
    }
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize, maxHeight, minHeight]);

  React.useEffect(() => {
    resize();
  }, [resize, props.value]);

  return (
    <textarea
      className={cn(
        "flex w-full rounded-md border border-input bg-muted px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-white focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={assignRef}
      onChange={(event) => {
        if (autoResize) resize();
        onChange?.(event);
      }}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
