import { cn } from "@/lib/utils";

type KeyboardShortcutHintProps = {
  keys: string[];
  className?: string;
};

export function KeyboardShortcutHint({
  keys,
  className,
}: KeyboardShortcutHintProps) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((key) => (
        <kbd
          key={key}
          className="border-border bg-background-muted text-muted rounded-md border px-2 py-1 font-mono text-[11px]"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}
