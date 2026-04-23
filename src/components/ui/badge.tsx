import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive"
  | "info";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-foreground text-background",
  secondary: "border border-border bg-background-muted text-foreground",
  outline: "border border-border bg-transparent text-foreground",
  success: "border border-success/30 bg-success/12 text-foreground",
  warning: "border border-warning/30 bg-warning/12 text-foreground",
  destructive: "border border-destructive/30 bg-destructive/12 text-foreground",
  info: "border border-info/30 bg-info/12 text-foreground",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
