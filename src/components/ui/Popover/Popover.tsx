import React from "react";
import { cn } from "../utils";

interface PopoverContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextType>({
  open: false,
  setOpen: () => {}
});

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Popover: React.FC<PopoverProps> = ({ children, open, defaultOpen = false, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const controlledOpen = open !== undefined ? open : isOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ open: controlledOpen, setOpen: handleOpenChange }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>);

};

const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ onClick, ...props }, ref) => {
    const { open, setOpen } = React.useContext(PopoverContext);
    return (
      <button ref={ref} type="button" data-slot="popover-trigger" aria-expanded={open} onClick={(e) => {setOpen(!open);onClick?.(e);}} {...props} />);

  }
);
PopoverTrigger.displayName = "PopoverTrigger";

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, ...props }, ref) => {
    const { open } = React.useContext(PopoverContext);
    if (!open) return null;

    return (
      <div
        ref={ref}
        data-slot="popover-content"
        className={cn(
          "absolute top-full left-0 z-50 mt-1 flex w-72 flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10",
          className
        )}
        {...props} />);


  }
);
PopoverContent.displayName = "PopoverContent";

const PopoverHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="popover-header" className={cn("flex flex-col gap-0.5 text-sm", className)} {...props} />

);
PopoverHeader.displayName = "PopoverHeader";

const PopoverTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="popover-title" className={cn("font-medium", className)} {...props} />

);
PopoverTitle.displayName = "PopoverTitle";

const PopoverDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) =>
  <p ref={ref} data-slot="popover-description" className={cn("text-muted-foreground", className)} {...props} />

);
PopoverDescription.displayName = "PopoverDescription";

export { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription };