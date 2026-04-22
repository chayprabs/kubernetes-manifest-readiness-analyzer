import { EmptyState } from "@/components/tool/empty-state";
import { FindingCard } from "@/components/tool/finding-card";
import type { K8sFinding } from "@/lib/k8s/types";

type ReadinessFindingListProps = {
  findings: K8sFinding[];
  compact?: boolean;
};

export function ReadinessFindingList({
  findings,
  compact = false,
}: ReadinessFindingListProps) {
  if (!findings.length) {
    return (
      <EmptyState
        title="No findings yet"
        description="Load a manifest to see production-readiness findings appear here."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {findings.map((finding) => (
        <FindingCard key={finding.id} finding={finding} compact={compact} />
      ))}
    </div>
  );
}
