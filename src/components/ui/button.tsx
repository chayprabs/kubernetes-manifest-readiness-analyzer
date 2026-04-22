import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-foreground text-background hover:bg-accent-strong",
  secondary: "bg-background-muted text-foreground hover:bg-accent-soft",
  outline:
    "border border-border bg-card text-foreground hover:border-accent hover:text-accent",
  ghost: "text-foreground hover:bg-accent-soft",
  destructive: "bg-destructive text-white hover:opacity-90",
  success: "bg-success text-white hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-10 w-10",
};

export function buttonVariants({
  className,
  size = "default",
  variant = "default",
}: {
  className?: string | undefined;
  size?: ButtonSize | undefined;
  variant?: ButtonVariant | undefined;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={buttonVariants({ className, size, variant })}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
