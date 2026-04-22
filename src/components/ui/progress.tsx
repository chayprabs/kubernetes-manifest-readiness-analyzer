"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn, clamp } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const progressValue = value ?? 0;

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "bg-background-muted relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      value={progressValue}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="bg-accent h-full rounded-full transition-all"
        style={{ width: `${clamp(progressValue, 0, 100)}%` }}
      />
    </ProgressPrimitive.Root>
  );
});

Progress.displayName = ProgressPrimitive.Root.displayName;
