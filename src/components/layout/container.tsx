import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  size?: "page" | "prose" | "workspace";
};

const sizeClasses: Record<NonNullable<ContainerProps["size"]>, string> = {
  page: "max-w-6xl",
  prose: "max-w-4xl",
  workspace: "max-w-[1600px]",
};

export function Container({
  children,
  className,
  size = "page",
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 sm:px-8 lg:px-10",
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
