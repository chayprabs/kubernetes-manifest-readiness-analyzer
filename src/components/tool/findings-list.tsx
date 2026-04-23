"use client";

import { useEffect, useState } from "react";
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
};

export function FindingsList({
  findings,
  totalCount = findings.length,
  compact = false,
  emptyTitle,
  emptyDescription,
  initialVisibleCount = 12,
}: FindingsListProps) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
  }, [findings, initialVisibleCount]);

  if (!findings.length) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  const visibleFindings = findings.slice(0, visibleCount);
  const hasHiddenFindings = findings.length > visibleCount;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm leading-6">
          {totalCount === findings.length
            ? `Showing ${formatFindingCount(findings.length)}.`
            : `Showing ${formatFindingCount(findings.length)} from ${formatFindingCount(totalCount)}.`}
        </p>
        {findings.length > initialVisibleCount ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setVisibleCount(
                hasHiddenFindings ? visibleCount + initialVisibleCount : initialVisibleCount,
              )
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
          <FindingCard key={finding.id} finding={finding} compact={compact} />
        ))}
      </div>
    </div>
  );
}
