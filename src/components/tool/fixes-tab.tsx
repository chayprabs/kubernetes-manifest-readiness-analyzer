"use client";

import type { ReactNode } from "react";
import type { AnalyticsEventPayloadInput } from "@/lib/analytics/events";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { K8sFinding } from "@/lib/k8s/types";
import {
  buildFixBuckets,
  buildSafeCopyFixBundle,
  k8sWhyNotAutoApplyNote,
  type K8sFixBucket,
} from "@/lib/k8s/fix-checklist";
import {
  formatK8sCategoryLabel,
  formatK8sResourceLabel,
} from "@/components/tool/k8s-dashboard-helpers";
import { CopyButton } from "@/components/tool/copy-button";
import { EmptyState } from "@/components/tool/empty-state";
import { FixSuggestionCard } from "@/components/tool/fix-suggestion-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatFindingCount } from "@/lib/utils";

type FixesTabProps = {
  findings: readonly K8sFinding[];
  totalFixCount: number;
  analyticsPayload?: AnalyticsEventPayloadInput | undefined;
};

export function FixesTab({
  findings,
  totalFixCount,
  analyticsPayload,
}: FixesTabProps) {
  const [safeCopyBucket, manualReviewBucket] = buildFixBuckets(findings);
  const safeCopyBundle = buildSafeCopyFixBundle(findings);

  if (totalFixCount === 0) {
    return (
      <EmptyState
        title="No fix suggestions available"
        description="The current report did not attach copyable snippets or manual remediation guidance to its findings."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <AlertTitle>Suggested patches only</AlertTitle>
        <AlertDescription>
          Copyable snippets are designed to speed up review, not to skip it.{" "}
          {k8sWhyNotAutoApplyNote}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <FixSummaryStat
          label="Findings with fixes"
          value={String(totalFixCount)}
        />
        <FixSummaryStat
          label="Safe copy snippets"
          value={String(safeCopyBucket.count)}
        />
        <FixSummaryStat
          label="Manual-review items"
          value={String(manualReviewBucket.count)}
        />
      </div>

      <BucketSection
        bucket={safeCopyBucket}
        title="Safe copy snippets"
        description="Copyable suggested patches and templates appear here first. Copying is safe; applying still needs review in your own manifest context."
        analyticsPayload={analyticsPayload}
        action={
          safeCopyBundle ? (
            <CopyButton
              value={safeCopyBundle}
              label="Copy all safe snippets"
              copiedLabel="Copied all safe snippets"
              showText
              showInlineFeedback
              onCopySuccess={() =>
                trackAnalyticsEvent("fix_copied", analyticsPayload)
              }
            />
          ) : null
        }
        emptyTitle="No copyable snippets match the current filters"
        emptyDescription="The visible fixes are all manual-review items right now, so there is nothing to bundle into a safe copy checklist."
      />

      <BucketSection
        bucket={manualReviewBucket}
        title="Manual review required"
        description="These fixes still need a human to choose the exact manifest change, even if the analyzer can explain the intent."
        analyticsPayload={analyticsPayload}
        emptyTitle="No manual-review-only fixes in this view"
        emptyDescription="Every visible fix currently includes a copyable template or suggested patch."
      />
    </div>
  );
}

function BucketSection({
  bucket,
  title,
  description,
  action,
  emptyTitle,
  emptyDescription,
  analyticsPayload,
}: {
  bucket: K8sFixBucket;
  title: string;
  description: string;
  action?: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  analyticsPayload?: AnalyticsEventPayloadInput | undefined;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {action}
        </div>
        <p className="text-muted text-sm leading-6">
          {bucket.count > 0
            ? `Showing ${formatFindingCount(bucket.count)} in this section.`
            : "Nothing is currently grouped into this section."}
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        {bucket.count > 0 ? (
          bucket.categories.map((categoryGroup) => (
            <div key={categoryGroup.category} className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-foreground text-sm font-semibold">
                  {formatK8sCategoryLabel(categoryGroup.category)}
                </p>
                <Badge variant="secondary">
                  {formatFindingCount(categoryGroup.count)}
                </Badge>
              </div>

              {categoryGroup.resources.map((resourceGroup) => (
                <div
                  key={resourceGroup.id}
                  className="border-border bg-background-muted/20 grid gap-4 rounded-3xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-foreground text-sm font-semibold">
                        {formatK8sResourceLabel(resourceGroup.resourceRef)}
                      </p>
                      <p className="text-muted text-xs leading-5">
                        {resourceGroup.count === 1
                          ? "1 suggested remediation"
                          : `${resourceGroup.count} suggested remediations`}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {resourceGroup.resourceRef.namespace ?? "Cluster-scoped"}
                    </Badge>
                  </div>

                  <div className="grid gap-4">
                    {resourceGroup.findings.map((finding) => (
                      <FixSuggestionCard
                        key={finding.id}
                        finding={finding}
                        showFindingContext
                        analyticsPayload={analyticsPayload}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </CardContent>
    </Card>
  );
}

function FixSummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-background-muted/25 rounded-2xl border p-4">
      <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
