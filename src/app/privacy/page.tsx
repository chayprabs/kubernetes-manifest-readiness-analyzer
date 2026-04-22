import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { privacyMetadata } from "@/lib/site";

export const metadata: Metadata = privacyMetadata;

export default function PrivacyPage() {
  return (
    <Container size="prose" className="space-y-8">
      <SectionHeading
        eyebrow="Privacy"
        title="Local browser processing is the default direction"
        description="Authos is being built as a browser-first toolset, and the first tool is designed for local browser processing."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>First-tool privacy stance</CardTitle>
            <CardDescription>
              The Kubernetes Manifest Production-Readiness Analyzer is intended
              to analyze content locally in the browser so teams can review
              manifests without introducing a backend upload path.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Core product boundary</CardTitle>
            <CardDescription>
              This foundation does not include authentication, a server
              database, or third-party AI APIs. The current focus is the browser
              app shell, tool architecture, and quality checks.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </Container>
  );
}
