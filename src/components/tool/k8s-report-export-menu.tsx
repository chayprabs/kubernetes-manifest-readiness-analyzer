"use client";

import { useEffect, useState } from "react";
import type { AnalyticsEventPayloadInput } from "@/lib/analytics/events";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { ChevronDown } from "lucide-react";
import type { K8sAnalysisReport } from "@/lib/k8s/types";
import {
  buildK8sCsvFindingsExport,
  buildK8sExportBaseName,
  buildK8sJsonExport,
  buildK8sMarkdownExport,
  downloadTextFile,
} from "@/lib/k8s/report-export";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type K8sReportExportMenuProps = {
  report: K8sAnalysisReport | null;
  redactVisibleOutput: boolean;
  analyticsPayload?: AnalyticsEventPayloadInput | undefined;
};

export function K8sReportExportMenu({
  report,
  redactVisibleOutput,
  analyticsPayload,
}: K8sReportExportMenuProps) {
  const [rawManifestDialogOpen, setRawManifestDialogOpen] = useState(false);
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

  async function handleCopyMarkdown() {
    if (!report) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildK8sMarkdownExport(report, {
          redactSensitiveOutput: redactVisibleOutput,
        }),
      );
      setStatusMessage("Markdown report copied.");
      trackAnalyticsEvent("report_copied", analyticsPayload);
    } catch {
      setStatusMessage("Clipboard access failed. Try a download instead.");
    }
  }

  function handleDownloadMarkdown() {
    if (!report) {
      return;
    }

    const baseName = buildK8sExportBaseName(report);

    downloadTextFile(
      `${baseName}.md`,
      buildK8sMarkdownExport(report, {
        redactSensitiveOutput: redactVisibleOutput,
      }),
      "text/markdown;charset=utf-8",
    );
    setStatusMessage("Markdown report downloaded.");
    trackAnalyticsEvent("report_downloaded", analyticsPayload);
  }

  function handleDownloadJson() {
    if (!report) {
      return;
    }

    const baseName = buildK8sExportBaseName(report);

    downloadTextFile(
      `${baseName}.json`,
      buildK8sJsonExport(report, {
        redactSensitiveOutput: redactVisibleOutput,
      }),
      "application/json;charset=utf-8",
    );
    setStatusMessage("JSON report downloaded.");
    trackAnalyticsEvent("report_downloaded", analyticsPayload);
  }

  function handleDownloadJsonWithManifest() {
    if (!report) {
      return;
    }

    const baseName = buildK8sExportBaseName(report);

    downloadTextFile(
      `${baseName}-with-manifest.json`,
      buildK8sJsonExport(report, {
        includeRawInput: true,
        redactSensitiveOutput: redactVisibleOutput,
      }),
      "application/json;charset=utf-8",
    );
    setRawManifestDialogOpen(false);
    setStatusMessage(
      redactVisibleOutput
        ? "Redacted manifest report downloaded."
        : "Manifest-inclusive JSON downloaded. Review before sharing.",
    );
    trackAnalyticsEvent("report_downloaded", analyticsPayload);
  }

  function handleDownloadCsv() {
    if (!report) {
      return;
    }

    const baseName = buildK8sExportBaseName(report);

    downloadTextFile(
      `${baseName}.csv`,
      buildK8sCsvFindingsExport(report, {
        redactSensitiveOutput: redactVisibleOutput,
      }),
      "text/csv;charset=utf-8",
    );
    setStatusMessage("CSV findings report downloaded.");
    trackAnalyticsEvent("report_downloaded", analyticsPayload);
  }

  return (
    <>
      <div className="grid gap-2">
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              trackAnalyticsEvent("export_opened", analyticsPayload);
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={!report}
              aria-label="Open export report menu"
            >
              Export report
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              Export report {redactVisibleOutput ? "(redacted)" : "(full view)"}
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={!report}
              onClick={() => void handleCopyMarkdown()}
            >
              Copy Markdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!report}
              onClick={handleDownloadMarkdown}
            >
              Download Markdown
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!report} onClick={handleDownloadJson}>
              Download JSON
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!report} onClick={handleDownloadCsv}>
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!report}
              onClick={() => setRawManifestDialogOpen(true)}
            >
              Download JSON with manifest...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <p className="text-muted text-xs leading-5" aria-live="polite">
          {statusMessage ??
            "Copy or download a redacted report from this compact export menu."}
        </p>
      </div>

      <Dialog
        open={rawManifestDialogOpen}
        onOpenChange={setRawManifestDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Include manifest content in export?</DialogTitle>
            <DialogDescription>
              Manifest exports can expose Secret references, internal service
              names, hostnames, and annotations. Review before sharing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 text-sm leading-6">
            <p>
              Raw YAML is excluded by default. This extra export can include a
              manifest section after explicit confirmation.
            </p>
            <p>
              {redactVisibleOutput
                ? "Redaction is currently on, so the manifest section will stay redacted before download."
                : "Redaction is currently off, so the manifest section can include full visible values from the current report."}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRawManifestDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={redactVisibleOutput ? "default" : "destructive"}
              onClick={handleDownloadJsonWithManifest}
            >
              {redactVisibleOutput
                ? "Download with redacted manifest"
                : "Download with manifest anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
