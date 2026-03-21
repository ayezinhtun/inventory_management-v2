import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../utils";

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        className={cn("size-4 animate-spin", className)}
        {...props} />);


  }
);
Spinner.displayName = "Spinner";

export { Spinner };