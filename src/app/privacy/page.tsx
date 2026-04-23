import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { privacyMetadata } from "@/lib/site";

export const metadata: Metadata = privacyMetadata;

export default function PrivacyPage() {
  return (
    <Container size="prose" className="space-y-8">
      <SectionHeading
        eyebrow="Privacy"
        title="Local browser processing is the default direction"
        description="Authos is being built as a browser-first toolset, and the Kubernetes manifest analyzer is designed to keep sensitive review flows inside the browser by default."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>First-tool privacy stance</CardTitle>
            <CardDescription>
              The Kubernetes Manifest Production-Readiness Analyzer runs its
              parsing, scoring, findings, and remediation guidance locally in
              the browser. The current tool does not require a backend manifest
              upload path to do its work.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Core product boundary</CardTitle>
            <CardDescription>
              This product does not require authentication, backend storage, or
              third-party AI APIs for the Kubernetes analyzer. Optional
              analytics stays off by default and only supports sanitized public
              event payloads when explicitly configured.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Badge variant="info">Manifest handling</Badge>
            <CardTitle>Raw YAML stays local</CardTitle>
          </CardHeader>
          <CardContent className="text-muted text-sm leading-7">
            Pasted YAML is held in browser memory for the current session. Raw
            manifest content is not persisted to localStorage by default.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="info">Exports</Badge>
            <CardTitle>Redacted by default</CardTitle>
          </CardHeader>
          <CardContent className="text-muted text-sm leading-7">
            Report exports exclude raw YAML by default. Visible JSON and raw
            manifest sections stay redacted unless a user explicitly asks for a
            less-redacted export and confirms the warning.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="info">Telemetry</Badge>
            <CardTitle>Safe analytics only, and off by default</CardTitle>
          </CardHeader>
          <CardContent className="text-muted text-sm leading-7">
            If analytics is enabled through public environment variables, it is
            limited to timings, counts, selected options, and coarse error
            categories. Raw YAML, resource names, namespaces, and finding text
            stay out.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Practical guidance</CardTitle>
          <CardDescription>
            Local processing reduces exposure, but Kubernetes bundles can still
            carry production secrets and internal topology details.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted grid gap-4 text-sm leading-7">
          <p>
            Exports and visible JSON are intentionally conservative, especially
            around Secret `data`, Secret `stringData`, literal secret-looking
            environment variables, sensitive annotations, and credential-like
            tokens.
          </p>
          <p>
            Teams should still avoid pasting production secrets when possible.
            If you can review rendered output sections or already-redacted
            manifests, that is the safer input path.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
