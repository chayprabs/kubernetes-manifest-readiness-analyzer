import { Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type LocalOnlyNoticeProps = {
  description?: string;
};

export function LocalOnlyNotice({
  description = "Core review flows are designed to stay local in your browser whenever possible, so you can inspect manifests without sending them to a backend by default.",
}: LocalOnlyNoticeProps) {
  return (
    <Alert variant="info">
      <AlertTitle className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        Local-first processing
      </AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
