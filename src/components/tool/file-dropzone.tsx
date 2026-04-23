"use client";

import { useId, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

type FileDropzonePayload = {
  file: File;
  text: string;
};

type FileDropzoneProps = {
  accept?: string;
  className?: string;
  description?: string;
  disabled?: boolean;
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
  onTextLoaded?: (payload: FileDropzonePayload) => void | Promise<void>;
  title?: string;
};

export function FileDropzone({
  accept = ".yaml,.yml,.json,.txt",
  className,
  description = "Drop Kubernetes YAML, JSON, or plain text manifests here, or browse locally.",
  disabled = false,
  multiple = false,
  onFilesSelected,
  onTextLoaded,
  title = "Drop a manifest to analyze",
}: FileDropzoneProps) {
  const inputId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFiles(files: File[]) {
    if (!files.length || disabled) {
      return;
    }

    onFilesSelected?.(files);

    if (!onTextLoaded) {
      return;
    }

    for (const file of files) {
      const text = await file.text();
      await onTextLoaded({ file, text });
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        multiple={multiple}
        onChange={(event) =>
          void handleFiles(Array.from(event.target.files ?? []))
        }
      />
      <label
        htmlFor={inputId}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-disabled={disabled}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className={cn(
          "border-border bg-background-muted/60 focus-visible:ring-accent focus-visible:ring-offset-background flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed px-6 py-10 text-center transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          isDragging && "border-accent bg-accent-soft",
          disabled && "cursor-not-allowed opacity-60",
        )}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(Array.from(event.dataTransfer.files));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <div className="bg-card text-accent flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm">
          <FileUp className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <p id={titleId} className="text-foreground text-sm font-semibold">
            {title}
          </p>
          <p
            id={descriptionId}
            className="text-muted max-w-md text-sm leading-6"
          >
            {description}
          </p>
        </div>
      </label>
    </div>
  );
}
