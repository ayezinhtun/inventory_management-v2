import React from "react";
import { cn } from "../utils";

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextType>({
  open: false,
  setOpen: () => {}
});

interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ children, open, defaultOpen = false, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const controlledOpen = open !== undefined ? open : isOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <AlertDialogContext.Provider value={{ open: controlledOpen, setOpen: handleOpenChange }}>
      {children}
    </AlertDialogContext.Provider>);

};

interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  ({ asChild = false, onClick, children, ...props }, ref) => {
    const { setOpen } = React.useContext(AlertDialogContext);
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ref,
        onClick: (e: any) => {
          setOpen(true);
          onClick?.(e);
          (children.props as any).onClick?.(e);
        },
        ...props,
      });
    }
    
    return (
      <button ref={ref} type="button" data-slot="alert-dialog-trigger" onClick={(e) => {setOpen(true);onClick?.(e);}} {...props}>
        {children}
      </button>
    );
  }
);
AlertDialogTrigger.displayName = "AlertDialogTrigger";

interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "sm";
}

const AlertDialogContent = React.forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, size = "default", ...props }, ref) => {
    const { open } = React.useContext(AlertDialogContext);
    if (!open) return null;

    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/10 supports-[backdrop-filter]:backdrop-blur-[2px]" />
        <div
          ref={ref}
          data-slot="alert-dialog-content"
          data-size={size}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 ring-1 ring-foreground/10 max-w-sm",
            className
          )}
          {...props} />
        
      </>);

  }
);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="alert-dialog-header" className={cn("grid gap-1.5 text-center sm:text-left", className)} {...props} />

);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="alert-dialog-footer" className={cn("-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end", className)} {...props} />

);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) =>
  <h2 ref={ref} data-slot="alert-dialog-title" className={cn("text-base font-medium", className)} {...props} />

);
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) =>
  <p ref={ref} data-slot="alert-dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />

);
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => {
    const { setOpen } = React.useContext(AlertDialogContext);
    return (
      <button
        ref={ref}
        type="button"
        data-slot="alert-dialog-action"
        onClick={(e) => {setOpen(false);onClick?.(e);}}
        className={cn("inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground", className)}
        {...props} />);


  }
);
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => {
    const { setOpen } = React.useContext(AlertDialogContext);
    return (
      <button
        ref={ref}
        type="button"
        data-slot="alert-dialog-cancel"
        onClick={(e) => {setOpen(false);onClick?.(e);}}
        className={cn("inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted", className)}
        {...props} />);


  }
);
AlertDialogCancel.displayName = "AlertDialogCancel";

export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };