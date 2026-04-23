import Link from "next/link";
import { CopyButton } from "@/components/tool/copy-button";
import { K8sPrivacySection } from "@/components/tool/k8s-privacy-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  k8sManifestExamples,
  type K8sManifestExample,
} from "@/lib/k8s/examples";
import {
  k8sAnalyzerComingSoonTools,
  k8sAnalyzerFaqs,
} from "@/lib/k8s/landing-content";

type K8sAnalyzerLandingContentProps = {
  onLoadExample: (example: K8sManifestExample) => void;
};

const exampleFocusMap: Record<K8sManifestExample["id"], string> = {
  "missing-probes-and-resources": "Probes checker and resource requests review",
  "secure-production-deployment":
    "Healthy baseline and positive production-readiness checks",
  "service-selector-mismatch": "Service selector checker and networking triage",
  "public-loadbalancer-risk":
    "Exposure review for LoadBalancer and Ingress manifests",
  "deprecated-api-example":
    "Deprecated API review against newer Kubernetes targets",
  "cronjob-risk-example": "CronJob reliability defaults and operational safety",
};

export function K8sAnalyzerLandingContent({
  onLoadExample,
}: K8sAnalyzerLandingContentProps) {
  return (
    <>
      <section className="space-y-4" aria-labelledby="sample-manifests-heading">
        <div className="space-y-2">
          <Badge variant="info">Examples</Badge>
          <h2
            id="sample-manifests-heading"
            className="text-foreground text-3xl font-semibold"
          >
            Try example Kubernetes manifests in the live editor
          </h2>
          <p className="text-muted max-w-4xl text-sm leading-7">
            These example cards are meant to improve both evaluation and usage.
            Each one loads directly into the editor so you can see how the
            Kubernetes YAML checker responds to missing probes, resource limits,
            service selector mismatches, exposure risks, and deprecated APIs.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {k8sManifestExamples.map((example) => (
            <Card key={example.id} className="flex h-full flex-col">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{exampleFocusMap[example.id]}</Badge>
                </div>
                <CardTitle>{example.title}</CardTitle>
                <CardDescription>{example.summary}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto grid gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => onLoadExample(example)}>
                    Load into editor
                  </Button>
                  <CopyButton value={example.manifest} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6" aria-labelledby="analyzer-checks-heading">
        <div className="space-y-2">
          <Badge variant="secondary">What it checks</Badge>
          <h2
            id="analyzer-checks-heading"
            className="text-foreground text-3xl font-semibold"
          >
            What the analyzer checks
          </h2>
          <p className="text-muted max-w-4xl text-sm leading-7">
            This tool acts as a Kubernetes manifest analyzer, Kubernetes YAML
            checker, and practical production-readiness review surface for teams
            who want fast feedback before a deploy. It focuses on the kinds of
            issues that often pass basic syntax validation but still cause
            rollout failures, flaky services, weak runtime hardening, or risky
            exposure.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Reliability and rollout health</CardTitle>
              <CardDescription>
                Looks for missing readiness or liveness probes, fragile
                Deployment defaults, thin operational guardrails, and resource
                gaps that can make Kubernetes workloads unstable in production.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Security and runtime hardening</CardTitle>
              <CardDescription>
                Reviews security context choices such as non-root execution,
                privilege escalation, token mounting, filesystem posture, and
                other signals that influence safer workload configuration.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Networking and exposure safety</CardTitle>
              <CardDescription>
                Checks Service selectors, public Service and Ingress exposure,
                TLS gaps, and related patterns that can break traffic or expose
                workloads more broadly than intended.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-foreground text-3xl font-semibold">
              Why Kubernetes manifests fail in production
            </h2>
            <CardDescription className="text-sm leading-7">
              Many manifest problems are not syntax errors. They are context and
              operations errors that show up only when a workload has to start,
              stay healthy, route traffic, and survive real production load.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-foreground grid gap-3 text-sm leading-7">
              <li>
                Missing probes can turn a slow-starting container into a noisy
                restart loop or a Service that sends traffic too early.
              </li>
              <li>
                Missing resource requests or unrealistic limits create
                scheduling surprises, eviction pressure, or performance
                instability.
              </li>
              <li>
                Service selectors, labels, and ports drift out of alignment more
                easily than many teams expect, especially in large generated
                bundles.
              </li>
              <li>
                Security defaults are often too permissive for production, even
                when the manifest still applies successfully.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-foreground text-3xl font-semibold">
              How to use the analyzer
            </h2>
            <CardDescription className="text-sm leading-7">
              The workflow is deliberately simple so teams can move from pasted
              YAML to useful remediation guidance quickly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="text-foreground grid gap-3 text-sm leading-7">
              <li>
                1. Paste rendered manifests, upload files, or load a sample into
                the editor.
              </li>
              <li>
                2. Choose the Kubernetes target version and analysis profile
                that best match your environment.
              </li>
              <li>
                3. Review the score, findings, grouped fixes, and suggested
                patches with redaction left on unless you have a reason to
                disable it.
              </li>
              <li>
                4. Copy the suggested YAML templates into your own workflow,
                customize them, and validate them alongside your normal CI or
                admission controls.
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="reliability-checks">
        <h2
          id="reliability-checks"
          className="text-foreground text-3xl font-semibold"
        >
          Kubernetes reliability checks
        </h2>
        <p className="text-muted max-w-4xl text-sm leading-7">
          The reliability pass is built for teams looking for a Kubernetes
          probes checker or Kubernetes resource limits checker, but it goes
          wider than those labels. It reviews whether Deployments, CronJobs, and
          related resources are set up with operational defaults that can hold
          up under rollout pressure and normal incident conditions.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Health and startup behavior</CardTitle>
              <CardDescription>
                Readiness and liveness probe coverage, container port alignment,
                and startup assumptions that influence when traffic should begin
                or when restarts should happen.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Capacity and disruption planning</CardTitle>
              <CardDescription>
                Resource requests, resource limits, replicas,
                PodDisruptionBudget guidance, and CronJob defaults that
                influence scheduling and resilience.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="security-checks">
        <h2
          id="security-checks"
          className="text-foreground text-3xl font-semibold"
        >
          Kubernetes security checks
        </h2>
        <p className="text-muted max-w-4xl text-sm leading-7">
          The security pass behaves like a focused Kubernetes security context
          checker. It highlights common hardening gaps without claiming that a
          manifest is fully compliant or fully safe. Warnings are there to help
          teams review runtime posture earlier, not to replace cluster policy.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Container privilege posture</CardTitle>
              <CardDescription>
                Flags risky settings around root execution, privilege
                escalation, writable filesystems, Linux capabilities, and
                seccomp defaults.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Token and secret handling</CardTitle>
              <CardDescription>
                Surfaces token mounting and secret-related privacy warnings
                while keeping decoded Secret contents out of the interface.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Practical, not absolute</CardTitle>
              <CardDescription>
                The checks are meant to support review and remediation. They do
                not guarantee Pod Security Standards compliance or broader
                organizational policy coverage by themselves.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="networking-checks">
        <h2
          id="networking-checks"
          className="text-foreground text-3xl font-semibold"
        >
          Kubernetes networking and exposure checks
        </h2>
        <p className="text-muted max-w-4xl text-sm leading-7">
          Networking mistakes are often small YAML mismatches with large impact.
          This page includes a practical Kubernetes service selector checker and
          exposure review so teams can catch traffic-breaking or internet-facing
          surprises before deploy time.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Service and label alignment</CardTitle>
              <CardDescription>
                Helps catch Services whose selectors no longer match Pod labels
                after refactors, chart changes, or generated manifest churn.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ingress, TLS, and exposure review</CardTitle>
              <CardDescription>
                Highlights public LoadBalancer or Ingress patterns, missing TLS
                coverage, and templates that need environment-specific hostnames
                or secret names.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>NetworkPolicy caution</CardTitle>
              <CardDescription>
                Suggested NetworkPolicy templates are intentionally labeled for
                careful review because default-deny rules can break expected
                traffic if applied without context.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="tool-limitations">
        <h2
          id="tool-limitations"
          className="text-foreground text-3xl font-semibold"
        >
          What this tool does not do
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Not a live cluster validator</CardTitle>
              <CardDescription>
                It does not connect to your cluster, inspect runtime state, or
                claim live environment validation. The analysis is based on the
                manifests you provide locally.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Not a one-click auto-fixer</CardTitle>
              <CardDescription>
                Suggested patches are templates that must be reviewed in
                context. Kubernetes manifests are sensitive to ports, selectors,
                secret names, traffic patterns, and workload behavior.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Not a Helm or Kustomize renderer</CardTitle>
              <CardDescription>
                The tool works best with rendered output. It does not evaluate
                chart logic, values inheritance, or overlay composition on your
                behalf inside this page.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Not a compliance guarantee</CardTitle>
              <CardDescription>
                A clean report can improve review quality, but it does not mean
                a workload is certified, compliant, or fully safe for every
                production environment.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <K8sPrivacySection />

      <section className="space-y-4" aria-labelledby="coming-soon-tools">
        <div className="space-y-2">
          <Badge variant="secondary">Coming soon</Badge>
          <h2
            id="coming-soon-tools"
            className="text-foreground text-3xl font-semibold"
          >
            Related Kubernetes tools on the roadmap
          </h2>
          <p className="text-muted max-w-4xl text-sm leading-7">
            These are planned follow-on tools, not live features. The links
            below point to the tools catalog section that tracks what is coming
            next.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {k8sAnalyzerComingSoonTools.map((tool) => (
            <Card key={tool.title}>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Coming soon</Badge>
                </div>
                <CardTitle>{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href={tool.href}>View on tools page</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6" aria-labelledby="faq-heading">
        <div className="space-y-2">
          <Badge variant="info">FAQ</Badge>
          <h2
            id="faq-heading"
            className="text-foreground text-3xl font-semibold"
          >
            Frequently asked questions
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {k8sAnalyzerFaqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-xl">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-sm leading-7">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
