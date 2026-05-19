"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ToolExportFormat = {
  id: string;
  label: string;
  kind: "copy" | "download";
  buildContent: () => string;
  mimeType: string;
  fileName: string;
};

type ToolExportMenuBaseProps = {
  disabled?: boolean;
  formats: ToolExportFormat[];
  menuLabel?: string;
  statusIdleMessage?: string;
  onOpen?: () => void;
  onAction?: (formatId: string, kind: ToolExportFormat["kind"]) => void;
};

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ToolExportMenuBase({
  disabled = false,
  formats,
  menuLabel = "Export report",
  statusIdleMessage = "Copy or download a report from this export menu.",
  onOpen,
  onAction,
}: ToolExportMenuBaseProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [statusMessage]);

  async function runFormat(format: ToolExportFormat) {
    const content = format.buildContent();

    if (format.kind === "copy") {
      try {
        await navigator.clipboard.writeText(content);
        setStatusMessage(`${format.label} copied.`);
        onAction?.(format.id, format.kind);
      } catch {
        setStatusMessage("Clipboard access failed. Try a download instead.");
      }
      return;
    }

    downloadTextFile(format.fileName, content, format.mimeType);
    setStatusMessage(`${format.label} downloaded.`);
    onAction?.(format.id, format.kind);
  }

  const copyFormats = formats.filter((format) => format.kind === "copy");
  const downloadFormats = formats.filter((format) => format.kind === "download");

  return (
    <div className="grid gap-2">
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            onOpen?.();
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label="Open export report menu"
          >
            {menuLabel}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
          {copyFormats.map((format) => (
            <DropdownMenuItem
              key={format.id}
              disabled={disabled}
              onClick={() => void runFormat(format)}
            >
              {format.label}
            </DropdownMenuItem>
          ))}
          {copyFormats.length > 0 && downloadFormats.length > 0 ? (
            <DropdownMenuSeparator />
          ) : null}
          {downloadFormats.map((format) => (
            <DropdownMenuItem
              key={format.id}
              disabled={disabled}
              onClick={() => void runFormat(format)}
            >
              {format.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-muted text-xs leading-5" aria-live="polite">
        {statusMessage ?? statusIdleMessage}
      </p>
    </div>
  );
}
