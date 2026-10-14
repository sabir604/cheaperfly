"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export const PopoverContent = forwardRef<ElementRef<typeof PopoverPrimitive.Content>, ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(
  function PopoverContent({ className, align = "start", sideOffset = 8, ...props }, ref) {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={12}
          className={cn(
            "z-50 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-pop outline-none data-[state=open]:animate-pop",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    );
  },
);

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  hideClose,
  size = "md",
}: {
  className?: string;
  children?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  hideClose?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-navy-950/55 backdrop-blur-[2px] data-[state=open]:animate-[fade-up_0.15s_ease-out]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-[61] max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-pop focus:outline-none",
          { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-bold text-navy-900">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-slate-600">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          {!hideClose && (
            <DialogPrimitive.Close className="-mr-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Slide-in panel: left/right sheet, or a bottom sheet on mobile. */
export function Drawer({
  open,
  onOpenChange,
  title,
  side = "left",
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  side?: "left" | "right" | "bottom";
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-navy-950/55" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[61] flex flex-col bg-white shadow-pop focus:outline-none",
            side === "left" ? "left-0 top-0 h-full w-[88vw] max-w-sm" : side === "right" ? "right-0 top-0 h-full w-[88vw] max-w-sm" : "bottom-0 left-0 right-0 max-h-[88vh] rounded-t-2xl",
            className,
          )}
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <DialogPrimitive.Title className="text-base font-bold text-navy-900">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Close">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
