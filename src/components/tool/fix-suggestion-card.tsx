"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { K8sFinding } from "@/lib/k8s/types";
import {
  buildDisplayFixSnippet,
  buildFixCopyValue,
  formatK8sFixTypeLabel,
  getFixSnippetHeading,
  hasCopyableFixSnippet,
} from "@/lib/k8s/fix-checklist";
import { formatK8sResourceLabel } from "@/components/tool/k8s-dashboard-helpers";
import { BeforeAfterPreview } from "@/components/tool/before-after-preview";
import { CopyButton } from "@/components/tool/copy-button";
import { PatchRiskNote } from "@/components/tool/patch-risk-note";
import { YamlSnippetBlock } from "@/components/tool/yaml-snippet-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FixSuggestionCardProps = {
  finding: K8sFinding;
  compact?: boolean;
  showFindingContext?: boolean;
};

export function FixSuggestionCard({
  finding,
  compact = false,
  showFindingContext = false,
}: FixSuggestionCardProps) {
  const fix = finding.fix;
  const [snippetExpanded, setSnippetExpanded] = useState(!compact);
  const snippetRegionId = useId();

  if (!fix) {
    return null;
  }
  const snippet = buildDisplayFixSnippet(fix);
  const copyValue = buildFixCopyValue(finding) ?? snippet;
  const snippetHeading = getFixSnippetHeading(fix);
  const copyableSnippet = hasCopyableFixSnippet(finding);
  const hasPreview =
    !compact && Boolean(fix.preview?.before || fix.preview?.after);

  return (
    <div className="border-border bg-background-muted/45 grid gap-4 rounded-3xl border p-4">
      {showFindingContext ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{finding.title}</Badge>
            <Badge variant="outline">
              {formatK8sResourceLabel(finding.resourceRef)}
            </Badge>
          </div>
          <p className="text-muted text-sm leading-6">{finding.message}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-foreground text-sm font-semibold">{fix.title}</p>
            <Badge variant="outline">{formatK8sFixTypeLabel(fix.type)}</Badge>
            <Badge
              variant={
                fix.safeToAutoApply
                  ? "success"
                  : copyableSnippet
                    ? "warning"
                    : "destructive"
              }
            >
              {fix.safeToAutoApply
                ? "Lower-risk template"
                : copyableSnippet
                  ? "Review before applying"
                  : "Manual review required"}
            </Badge>
            {fix.yamlPath ? (
              <Badge variant="outline">Path {fix.yamlPath}</Badge>
            ) : null}
          </div>

          <p className="text-muted text-sm leading-6">{fix.summary}</p>
          {fix.type === "manual-instruction" ? (
            <p className="text-foreground text-sm leading-6">
              {fix.instructions}
            </p>
          ) : null}
        </div>
      </div>

      <PatchRiskNote finding={finding} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton
            value={copyValue}
            label={
              copyableSnippet ? "Copy suggested patch" : "Copy review note"
            }
            copiedLabel="Copied"
            showText
            showInlineFeedback
          />
          <p className="text-muted text-xs leading-5">
            {copyableSnippet
              ? "Suggested patch or template only. Review before applying."
              : "This one stays manual because the safe patch depends on your manifest context."}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSnippetExpanded((value) => !value)}
          aria-expanded={snippetExpanded}
          aria-controls={snippetRegionId}
        >
          {snippetExpanded
            ? "Hide snippet"
            : `Show ${snippetHeading.toLowerCase()}`}
          {snippetExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {snippetExpanded ? (
        <div id={snippetRegionId} className="grid gap-3">
          <div className="space-y-1">
            <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              {snippetHeading}
            </p>
            <p className="text-muted text-xs leading-5">
              Template language is intentional. Review, customize, and then
              paste it into the manifest where it belongs.
            </p>
          </div>
          <YamlSnippetBlock content={snippet} />
        </div>
      ) : null}

      {hasPreview && fix.preview ? (
        <div className="grid gap-2">
          <div className="space-y-1">
            <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              Before / After Preview
            </p>
            <p className="text-muted text-xs leading-5">
              Compare the analyzed draft with the suggested direction before you
              edit the manifest.
            </p>
          </div>
          <BeforeAfterPreview preview={fix.preview} />
        </div>
      ) : null}
    </div>
  );
}
