"use client";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type K8sReportExportMenuProps = {
  report: K8sAnalysisReport | null;
};

export function K8sReportExportMenu({
  report,
}: K8sReportExportMenuProps) {
  async function handleCopyMarkdown() {
    if (!report) {
      return;
    }

    await navigator.clipboard.writeText(buildK8sMarkdownExport(report));
  }

  function handleDownloadMarkdown() {
    if (!report) {
      return;
    }

    const baseName = buildK8sExportBaseName(report);

    downloadTextFile(
      `${baseName}.md`,
      buildK8sMarkdownExport(report),
      "text/markdown;charset=utf-8",
    );
  }

  function handleDownloadJson() {
    if (!report) {
      return;
    }

    const baseName = buildK8sExportBaseName(report);

    downloadTextFile(
      `${baseName}.json`,
      buildK8sJsonExport(report),
      "application/json;charset=utf-8",
    );
  }

  function handleDownloadCsv() {
    if (!report) {
      return;
    }

    const baseName = buildK8sExportBaseName(report);

    downloadTextFile(
      `${baseName}.csv`,
      buildK8sCsvFindingsExport(report),
      "text/csv;charset=utf-8",
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" disabled={!report}>
          Export report
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export report</DropdownMenuLabel>
        <DropdownMenuItem disabled={!report} onClick={() => void handleCopyMarkdown()}>
          Copy Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!report} onClick={handleDownloadMarkdown}>
          Download Markdown
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!report} onClick={handleDownloadJson}>
          Download JSON
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!report} onClick={handleDownloadCsv}>
          Download CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
