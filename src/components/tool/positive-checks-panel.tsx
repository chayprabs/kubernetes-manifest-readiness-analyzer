import { CheckCircle2 } from "lucide-react";
import type { K8sPositiveCheck } from "@/lib/k8s/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PositiveChecksPanelProps = {
  positiveChecks: readonly K8sPositiveCheck[];
};

export function PositiveChecksPanel({
  positiveChecks,
}: PositiveChecksPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Positive checks</CardTitle>
        <CardDescription>
          These checks passed for the current manifest set, but they are still
          only part of the overall production review.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {positiveChecks.length > 0 ? (
          positiveChecks.map((check) => (
            <div
              key={check.id}
              className="border-success/25 bg-success/8 grid gap-2 rounded-2xl border p-4"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-success h-4 w-4" />
                <p className="text-foreground text-sm font-semibold">
                  {check.title}
                </p>
              </div>
              <p className="text-muted text-sm leading-6">{check.summary}</p>
            </div>
          ))
        ) : (
          <p className="text-muted text-sm leading-6">
            Positive checks will appear here when the analyzer sees stronger
            readiness patterns in the current manifest set.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
