"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-ring disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-within:ring-destructive focus-within:border-destructive"
          )}
        >
          {leftIcon && (
            <span className="text-muted-foreground shrink-0">{leftIcon}</span>
          )}
          <input
            type={type}
            className={cn(
              "flex-1 bg-transparent outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <span className="text-muted-foreground shrink-0">{rightIcon}</span>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-destructive font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
