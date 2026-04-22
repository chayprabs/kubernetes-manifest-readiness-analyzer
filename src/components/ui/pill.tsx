import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PillProps = {
  children: ReactNode;
  tone?: "accent" | "muted";
};

const toneStyles: Record<NonNullable<PillProps["tone"]>, string> = {
  accent: "border-blue-200 bg-blue-50 text-accent-strong",
  muted: "border-border bg-background-muted text-foreground",
};

export function Pill({ children, tone = "accent" }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-3 py-1 font-mono text-xs tracking-[0.18em] uppercase",
        toneStyles[tone],
      )}
    >
      {children}
    </span>
  );
}
