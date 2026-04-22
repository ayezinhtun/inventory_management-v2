import React from "react";
import { cn } from "../utils";

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType>({
  open: false,
  setOpen: () => {}
});

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, open, defaultOpen = false, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const controlledOpen = open !== undefined ? open : isOpen;
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (open === undefined) setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  }, [open, onOpenChange]);

  // Close when clicking outside the dropdown
  React.useEffect(() => {
    if (!controlledOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleOpenChange(false);
      }
    };
    // Use capture phase so it fires before any inner click handlers
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [controlledOpen, handleOpenChange]);

  // Close on Escape key
  React.useEffect(() => {
    if (!controlledOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [controlledOpen, handleOpenChange]);

  return (
    <DropdownMenuContext.Provider value={{ open: controlledOpen, setOpen: handleOpenChange }}>
      <div ref={containerRef} className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
};

// ── Trigger ───────────────────────────────────────────────────

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** When true, the trigger merges its props onto its single child instead of
   *  rendering an extra <button> wrapper. Useful when the child is already a
   *  button-like element (e.g. SidebarMenuButton). */
  asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ onClick, asChild, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownMenuContext);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setOpen(!open);
      onClick?.(e);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          setOpen(!open);
          (children as React.ReactElement<any>).props?.onClick?.(e);
        },
        "aria-expanded": open,
        "data-slot": "dropdown-menu-trigger",
        ref,
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        type="button"
        data-slot="dropdown-menu-trigger"
        aria-expanded={open}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

// ── Content ───────────────────────────────────────────────────

type Side  = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: Side;
  align?: Align;
  /** Gap between trigger and content (px). Implemented via margin classes. */
  sideOffset?: number;
}

const SIDE_CLASSES: Record<Side, string> = {
  bottom: "top-full mt-1",
  top:    "bottom-full mb-1",
  right:  "left-full ml-2 top-0",
  left:   "right-full mr-2 top-0",
};

const ALIGN_CLASSES: Record<Side, Record<Align, string>> = {
  bottom: { start: "left-0",  center: "left-1/2 -translate-x-1/2",  end: "right-0"  },
  top:    { start: "left-0",  center: "left-1/2 -translate-x-1/2",  end: "right-0"  },
  right:  { start: "top-0",   center: "top-1/2 -translate-y-1/2",   end: "bottom-0" },
  left:   { start: "top-0",   center: "top-1/2 -translate-y-1/2",   end: "bottom-0" },
};

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, side = "bottom", align = "start", sideOffset: _sideOffset, ...props }, ref) => {
    const { open } = React.useContext(DropdownMenuContext);
    if (!open) return null;

    return (
      <div
        ref={ref}
        data-slot="dropdown-menu-content"
        className={cn(
          "absolute z-50 min-w-32 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
          SIDE_CLASSES[side],
          ALIGN_CLASSES[side][align],
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

// ── Item ──────────────────────────────────────────────────────

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  variant?: "default" | "destructive";
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, variant = "default", onClick, ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownMenuContext);
    return (
      <div
        ref={ref}
        role="menuitem"
        data-slot="dropdown-menu-item"
        data-variant={variant}
        onClick={(e) => {
          setOpen(false);
          onClick?.(e);
        }}
        className={cn(
          "relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          inset && "pl-7",
          variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive",
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

// ── Misc ──────────────────────────────────────────────────────

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dropdown-menu-label"
      className={cn("px-1.5 py-1 text-xs font-medium text-muted-foreground", inset && "pl-7", className)}
      {...props}
    />
  )
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  )
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

const DropdownMenuGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} data-slot="dropdown-menu-group" role="group" {...props} />
);
DropdownMenuGroup.displayName = "DropdownMenuGroup";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
};
