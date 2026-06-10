import React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../utils";

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placeholder?: string;
}

const SelectContext = React.createContext<SelectContextType>({
  open: false,
  setOpen: () => {}
});

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ children, value, defaultValue, onValueChange, disabled }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const controlledValue = value !== undefined ? value : internalValue;
  const selectRef = React.useRef<HTMLDivElement>(null);

  const handleChange = (newValue: string) => {
    if (disabled) return;
    if (value === undefined) setInternalValue(newValue);
    onValueChange?.(newValue);
    setOpen(false);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

  return (
    <SelectContext.Provider value={{ value: controlledValue, onValueChange: handleChange, open, setOpen: disabled ? () => {} : setOpen }}>
      <div ref={selectRef} data-slot="select" className={`relative inline-block${disabled ? ' opacity-50 pointer-events-none' : ''}`}>
        {children}
      </div>
    </SelectContext.Provider>);

};

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default";
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, size = "default", children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext);

    return (
      <button
        ref={ref}
        type="button"
        data-slot="select-trigger"
        data-size={size}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          size === "default" ? "h-8" : "h-7 rounded-md",
          className
        )}
        {...props}>
        
        {children}
        <ChevronDown className="pointer-events-none size-4 text-muted-foreground" />
      </button>);

  }
);
SelectTrigger.displayName = "SelectTrigger";

interface SelectValueProps {
  placeholder?: string;
  /** Override what is displayed in the trigger (e.g. pass the item name when value is an ID) */
  displayValue?: string;
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder, displayValue }) => {
  const { value } = React.useContext(SelectContext);
  // Use displayValue if provided, otherwise fall back to raw value
  const display = displayValue || (value && value !== 'none' ? value : undefined);
  return (
    <span data-slot="select-value" data-placeholder={!display || undefined} className={cn(!display && "text-muted-foreground", "truncate block overflow-hidden")}>
      {display || placeholder}
    </span>);

};

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open } = React.useContext(SelectContext);
    if (!open) return null;

    return (
      <div
        ref={ref}
        data-slot="select-content"
        className={cn(
          "absolute top-full left-0 z-[9999] mt-1 min-w-36 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
          className
        )}
        {...props}>
        
        {children}
      </div>);

  }
);
SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value: itemValue, ...props }, ref) => {
    const { value, onValueChange } = React.useContext(SelectContext);
    const isSelected = value === itemValue;

    return (
      <div
        ref={ref}
        data-slot="select-item"
        role="option"
        aria-selected={isSelected}
        onClick={() => onValueChange?.(itemValue)}
        className={cn(
          "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground",
          className
        )}
        {...props}>
        
        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
          {isSelected && <Check className="size-4" />}
        </span>
        <span>{children}</span>
      </div>);

  }
);
SelectItem.displayName = "SelectItem";

interface SelectGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectGroup = React.forwardRef<HTMLDivElement, SelectGroupProps>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="select-group" className={cn("p-1", className)} {...props} />

);
SelectGroup.displayName = "SelectGroup";

interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="select-label" className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)} {...props} />

);
SelectLabel.displayName = "SelectLabel";

interface SelectSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectSeparator = React.forwardRef<HTMLDivElement, SelectSeparatorProps>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="select-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />

);
SelectSeparator.displayName = "SelectSeparator";

export { Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator, SelectValue };