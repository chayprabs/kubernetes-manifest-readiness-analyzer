import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function K8sPrivacySection() {
  return (
    <section className="space-y-4" aria-labelledby="privacy-local-processing">
      <div className="space-y-2">
        <Badge variant="info">Privacy</Badge>
        <h2
          id="privacy-local-processing"
          className="text-foreground text-3xl font-semibold"
        >
          Privacy and local processing
        </h2>
        <p className="text-muted max-w-3xl text-sm leading-7">
          Kubernetes bundles often include Secret objects, internal hostnames,
          service names, and operational annotations. This tool keeps those
          review flows local by default, excludes raw YAML from exports unless
          you explicitly ask for it, and still encourages teams to avoid pasting
          production secrets when they can.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>In-browser analysis</CardTitle>
            <CardDescription>
              Pasted YAML stays in the browser session for analysis. There is no
              backend manifest upload path in this workflow.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redacted by default</CardTitle>
            <CardDescription>
              Exported reports omit raw YAML by default, and visible JSON stays
              redacted unless you deliberately turn redaction off.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Minimal telemetry boundary</CardTitle>
            <CardDescription>
              If analytics are added later, only counts, timings, and selected
              options should be tracked. Raw YAML and finding text stay out.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/privacy">Read the privacy page</Link>
        </Button>
        <p className="text-muted text-sm leading-7">
          The privacy page explains the local-only processing boundary and the
          redaction defaults in more detail.
        </p>
      </div>
    </section>
  );
}
