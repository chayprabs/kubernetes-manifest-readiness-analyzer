"use client";

import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PrivacyDetailsDialogProps = {
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
};

export function PrivacyDetailsDialog({
  triggerLabel = "Privacy details",
  triggerVariant = "ghost",
  triggerSize = "sm",
}: PrivacyDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={triggerVariant} size={triggerSize}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Privacy and local processing</DialogTitle>
          <DialogDescription>
            The Kubernetes manifest analyzer is designed as a local-first review
            workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm leading-6">
          <p>
            Analysis happens in this browser session. The current tool does not
            require a manifest upload path to produce scores, findings, and fix
            guidance.
          </p>
          <p>
            Raw YAML is not stored in localStorage. Export flows exclude raw
            manifest content by default, and visible JSON stays redacted unless
            you explicitly choose otherwise.
          </p>
          <p>
            If you include a manifest in an export, the UI warns first because
            Kubernetes YAML can carry Secret data, internal service names,
            annotations, tokens, and certificate references.
          </p>
          <p>
            Even with local processing, avoid pasting production secrets when
            possible. Prefer rendered manifests or redacted review bundles if
            you can.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
