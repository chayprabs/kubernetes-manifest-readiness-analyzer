import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { KeyboardShortcutHint } from "@/components/tool/keyboard-shortcut-hint";

type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const shortcutRows = [
  {
    keys: ["Ctrl/Cmd", "Enter"],
    label: "Analyze the current draft",
    note: "Works from the main page controls and the fallback textarea. Monaco keeps its own matching editor command too.",
  },
  {
    keys: ["Ctrl/Cmd", "K"],
    label: "Focus the findings search",
    note: "Jumps to the Findings tab and places focus in the filter search once a report is available.",
  },
  {
    keys: ["Esc"],
    label: "Close dialogs",
    note: "Works for the shortcut help dialog and confirmation dialogs.",
  },
] as const;

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            The analyzer keeps shortcuts intentionally small so they help during
            real review work without fighting the browser or the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {shortcutRows.map((shortcut) => (
            <div
              key={shortcut.label}
              className="border-border bg-background-muted/35 grid gap-3 rounded-2xl border p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <KeyboardShortcutHint keys={[...shortcut.keys]} />
                <p className="text-foreground text-sm font-semibold">
                  {shortcut.label}
                </p>
              </div>
              <p className="text-muted text-sm leading-6">{shortcut.note}</p>
            </div>
          ))}
        </div>

        <div className="border-border bg-background-muted/20 grid gap-2 rounded-2xl border p-4 text-sm leading-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Browser reserved</Badge>
            <p className="text-foreground font-semibold">Ctrl/Cmd + L</p>
          </div>
          <p className="text-muted">
            This shortcut still belongs to the browser address bar. The tool
            does not hijack it. Use the on-page Focus editor and Load sample
            actions instead.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
