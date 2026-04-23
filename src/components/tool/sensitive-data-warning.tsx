import type { K8sPrivacySummary } from "@/lib/k8s/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type SensitiveDataWarningProps = {
  privacy: K8sPrivacySummary;
};

export function SensitiveDataWarning({ privacy }: SensitiveDataWarningProps) {
  if (!privacy.sensitiveDataDetected) {
    return null;
  }

  return (
    <Alert variant="warning">
      <AlertTitle>{privacy.warningTitle}</AlertTitle>
      <AlertDescription>{privacy.warningText}</AlertDescription>
      <div className="flex flex-wrap gap-2">
        {privacy.detectedKinds.map((kind) => (
          <Badge key={kind} variant="warning">
            {formatPrivacyKind(kind)}
          </Badge>
        ))}
      </div>
    </Alert>
  );
}

function formatPrivacyKind(kind: K8sPrivacySummary["detectedKinds"][number]) {
  switch (kind) {
    case "secret-data":
      return "Secret data";
    case "secret-string-data":
      return "Secret stringData";
    case "sensitive-env-var":
      return "Literal env secret";
    case "sensitive-annotation":
      return "Sensitive annotation";
    case "cloud-credential":
      return "Cloud credential";
    case "private-key":
      return "Private key";
    case "internal-hostname":
      return "Internal host";
  }
}
