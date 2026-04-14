import * as React from "react";
import { cn } from "@/lib/utils";

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center rounded-md border border-input shadow-sm focus-within:ring-1 focus-within:ring-ring",
      "[&>input]:border-0 [&>input]:shadow-none [&>input]:focus-visible:ring-0",
      className
    )}
    {...props}
  />
));
InputGroup.displayName = "InputGroup";

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center px-3 text-sm text-muted-foreground bg-muted",
      "first:rounded-l-md first:border-r last:rounded-r-md last:border-l",
      className
    )}
    {...props}
  />
));
InputGroupAddon.displayName = "InputGroupAddon";

export { InputGroup, InputGroupAddon };
