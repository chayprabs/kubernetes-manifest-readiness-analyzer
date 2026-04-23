"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
  errorLabel?: string;
  ariaLabel?: string;
  showText?: boolean;
  showInlineFeedback?: boolean;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  onCopySuccess?: (() => void) | undefined;
  onCopyError?: (() => void) | undefined;
};

type CopyState = "idle" | "copied" | "error";

export function CopyButton({
  value,
  className,
  label = "Copy",
  copiedLabel = "Copied",
  errorLabel = "Copy failed",
  ariaLabel,
  showText = false,
  showInlineFeedback = false,
  size,
  variant,
  onCopySuccess,
  onCopyError,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      onCopySuccess?.();
    } catch {
      setState("error");
      onCopyError?.();
    }

    timeoutRef.current = window.setTimeout(() => {
      setState("idle");
      timeoutRef.current = null;
    }, 1600);
  }

  const copied = state === "copied";
  const copyFailed = state === "error";
  const visibleLabel = copied ? copiedLabel : copyFailed ? errorLabel : label;
  const statusMessage =
    state === "copied"
      ? "Copied to clipboard"
      : state === "error"
        ? "Clipboard access failed"
        : null;
  const buttonSize = size ?? (showText ? "sm" : "icon");
  const buttonVariant = variant ?? (showText ? "outline" : "ghost");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={buttonVariant}
              size={buttonSize}
              className={showText ? "shrink-0" : undefined}
              onClick={handleCopy}
              aria-label={
                copied
                  ? copiedLabel
                  : copyFailed
                    ? errorLabel
                    : (ariaLabel ?? `${label} to clipboard`)
              }
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {showText ? visibleLabel : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{visibleLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <span className="sr-only" aria-live="polite">
        {statusMessage ?? ""}
      </span>

      {showInlineFeedback && statusMessage ? (
        <span
          className={cn(
            "text-xs font-medium",
            copied ? "text-success" : "text-warning",
          )}
          aria-live="polite"
        >
          {statusMessage}
        </span>
      ) : null}
    </div>
  );
}
