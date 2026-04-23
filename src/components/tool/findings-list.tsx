"use client";

import { useState } from "react";
import type { AnalyticsEventPayloadInput } from "@/lib/analytics/events";
import { EmptyState } from "@/components/tool/empty-state";
import { FindingCard } from "@/components/tool/finding-card";
import { Button } from "@/components/ui/button";
import type { K8sFinding } from "@/lib/k8s/types";
import { formatFindingCount } from "@/lib/utils";

type FindingsListProps = {
  findings: K8sFinding[];
  totalCount?: number;
  compact?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  initialVisibleCount?: number;
  analyticsPayload?: AnalyticsEventPayloadInput | undefined;
};

const LARGE_FINDINGS_THRESHOLD = 200;
const LARGE_FINDINGS_PAGE_SIZE = 40;

export function FindingsList({
  findings,
  totalCount = findings.length,
  compact = false,
  emptyTitle,
  emptyDescription,
  initialVisibleCount = 12,
  analyticsPayload,
}: FindingsListProps) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [pageIndex, setPageIndex] = useState(0);
  const pagedMode = findings.length > LARGE_FINDINGS_THRESHOLD;
  const pageSize = pagedMode ? LARGE_FINDINGS_PAGE_SIZE : initialVisibleCount;

  if (!findings.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const pageStart = pagedMode ? pageIndex * pageSize : 0;
  const pageEnd = pagedMode
    ? Math.min(pageStart + pageSize, findings.length)
    : visibleCount;
  const visibleFindings = findings.slice(pageStart, pageEnd);
  const hasHiddenFindings = findings.length > visibleCount;
  const totalPages = pagedMode ? Math.ceil(findings.length / pageSize) : 1;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm leading-6">
          {pagedMode
            ? totalCount === findings.length
              ? `Showing ${formatFindingCount(visibleFindings.length)} from ${formatFindingCount(findings.length)} on page ${pageIndex + 1} of ${totalPages}.`
              : `Showing ${formatFindingCount(visibleFindings.length)} from ${formatFindingCount(findings.length)} filtered findings on page ${pageIndex + 1} of ${totalPages} (${formatFindingCount(totalCount)} total).`
            : totalCount === findings.length
              ? `Showing ${formatFindingCount(findings.length)}.`
              : `Showing ${formatFindingCount(findings.length)} from ${formatFindingCount(totalCount)}.`}
        </p>
        {pagedMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted text-xs leading-5">
              Large result sets are paged to keep the browser responsive.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
              disabled={pageIndex === 0}
              aria-label="Go to the previous findings page"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setPageIndex((value) => Math.min(totalPages - 1, value + 1))
              }
              disabled={pageIndex >= totalPages - 1}
              aria-label="Go to the next findings page"
            >
              Next
            </Button>
          </div>
        ) : findings.length > initialVisibleCount ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setVisibleCount(
                hasHiddenFindings
                  ? visibleCount + initialVisibleCount
                  : initialVisibleCount,
              )
            }
            aria-label={
              hasHiddenFindings ? "Show more findings" : "Show fewer findings"
            }
          >
            {hasHiddenFindings
              ? `Show ${Math.min(initialVisibleCount, findings.length - visibleCount)} more`
              : "Show less"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {visibleFindings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            compact={compact}
            analyticsPayload={analyticsPayload}
          />
        ))}
      </div>
    </div>
  );
}
