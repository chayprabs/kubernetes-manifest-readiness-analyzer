import type { HTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "info" | "success" | "warning" | "destructive";

const variantClasses: Record<AlertVariant, string> = {
  default: "border-border bg-card text-card-foreground",
  info: "border-info/30 bg-info/8 text-card-foreground",
  success: "border-success/30 bg-success/8 text-card-foreground",
  warning: "border-warning/30 bg-warning/8 text-card-foreground",
  destructive: "border-destructive/30 bg-destructive/8 text-card-foreground",
};

const variantIcons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  destructive: AlertCircle,
} as const;

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

export function Alert({
  className,
  children,
  variant = "default",
  ...props
}: AlertProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      role="alert"
      className={cn(
        "grid gap-3 rounded-2xl border px-4 py-3 shadow-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="grid gap-1">{children}</div>
      </div>
    </div>
  );
}

export function AlertTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-muted text-sm leading-6", className)} {...props} />
  );
}
