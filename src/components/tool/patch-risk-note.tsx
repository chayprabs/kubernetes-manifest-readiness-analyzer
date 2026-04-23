import type { K8sFinding } from "@/lib/k8s/types";
import { getFixCustomizationWarnings } from "@/lib/k8s/fix-checklist";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PatchRiskNoteProps = {
  finding: K8sFinding;
};

export function PatchRiskNote({ finding }: PatchRiskNoteProps) {
  if (!finding.fix) {
    return null;
  }

  const warnings = getFixCustomizationWarnings(finding);

  return (
    <Alert variant={warnings.length > 0 ? "warning" : "info"}>
      <AlertTitle>Review before applying</AlertTitle>
      <AlertDescription>{finding.fix.riskNote}</AlertDescription>
      {warnings.length > 0 ? (
        <div className="grid gap-2">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="border-warning/30 bg-card/70 rounded-2xl border px-3 py-2 text-sm leading-6"
            >
              {warning}
            </div>
          ))}
        </div>
      ) : null}
    </Alert>
  );
}
