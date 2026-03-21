import React from "react";
import { Search, Check } from "lucide-react";
import { cn } from "../utils";

const Command = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="command" className={cn("flex size-full flex-col overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground", className)} {...props} />

);
Command.displayName = "Command";

const CommandInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) =>
  <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <div className="flex h-8 items-center gap-2 rounded-lg border border-input/30 bg-input/30 px-2">
        <Search className="size-4 shrink-0 opacity-50" />
        <input
        ref={ref} data-slot="command-input"
        className={cn("w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)}
        {...props} />
      
      </div>
    </div>

);
CommandInput.displayName = "CommandInput";

const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="command-list" className={cn("max-h-72 overflow-y-auto overflow-x-hidden", className)} {...props} />

);
CommandList.displayName = "CommandList";

const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="command-empty" className={cn("py-6 text-center text-sm", className)} {...props} />

);
CommandEmpty.displayName = "CommandEmpty";

const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {heading?: string;}>(
  ({ className, heading, children, ...props }, ref) =>
  <div ref={ref} data-slot="command-group" className={cn("overflow-hidden p-1 text-foreground", className)} {...props}>
      {heading && <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{heading}</div>}
      {children}
    </div>

);
CommandGroup.displayName = "CommandGroup";

interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  checked?: boolean;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, children, disabled, checked, ...props }, ref) =>
  <div
    ref={ref} data-slot="command-item" data-disabled={disabled || undefined} data-checked={checked || undefined}
    className={cn(
      "relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none hover:bg-muted hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      disabled && "pointer-events-none opacity-50",
      className
    )}
    {...props}>
    
      {children}
      {checked && <Check className="ml-auto size-4" />}
    </div>

);
CommandItem.displayName = "CommandItem";

const CommandSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="command-separator" className={cn("-mx-1 h-px bg-border", className)} {...props} />

);
CommandSeparator.displayName = "CommandSeparator";

const CommandShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) =>
  <span ref={ref} data-slot="command-shortcut" className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />

);
CommandShortcut.displayName = "CommandShortcut";

export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut };