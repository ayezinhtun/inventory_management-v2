import React from "react";
import { cn } from "../utils";

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroupContext = React.createContext<{
  value?: string;
  name?: string;
  onValueChange?: (value: string) => void;
}>({});

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, defaultValue, onValueChange, name, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
    const controlledValue = value !== undefined ? value : internalValue;

    const handleChange = (newValue: string) => {
      if (value === undefined) setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <RadioGroupContext.Provider value={{ value: controlledValue, name, onValueChange: handleChange }}>
        <div
          ref={ref}
          data-slot="radio-group"
          role="radiogroup"
          className={cn("grid w-full gap-2", className)}
          {...props}>
          
          {children}
        </div>
      </RadioGroupContext.Provider>);

  }
);
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const isChecked = context.value === value;

    return (
      <label
        data-slot="radio-group-item"
        data-checked={isChecked || undefined}
        className={cn(
          "relative flex aspect-square size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input outline-none transition-colors",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          isChecked && "border-primary bg-primary text-primary-foreground dark:bg-primary",
          "dark:bg-input/30",
          className
        )}>
        
        <input
          ref={ref}
          type="radio"
          name={context.name}
          value={value}
          checked={isChecked}
          onChange={() => context.onValueChange?.(value)}
          className="sr-only"
          {...props} />
        
        {isChecked &&
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
        }
      </label>);

  }
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };