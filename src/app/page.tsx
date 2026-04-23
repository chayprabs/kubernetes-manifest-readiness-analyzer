import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { getFeaturedTools } from "@/lib/tools/registry";
import { ToolCard } from "@/components/tool/tool-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { homeMetadata, siteConfig } from "@/lib/site";

const featuredTools = getFeaturedTools(3);
const [primaryTool] = featuredTools;

export const metadata: Metadata = homeMetadata;

export default function Home() {
  return (
    <Container size="page" className="flex flex-col gap-16 pb-8">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="gap-5">
            <Badge variant="info">Now live</Badge>
            <div className="space-y-4">
              <CardTitle className="max-w-3xl text-4xl sm:text-5xl">
                Authos launches with a local Kubernetes manifest analyzer for
                production-readiness reviews.
              </CardTitle>
              <CardDescription className="max-w-2xl text-lg">
                Paste YAML, upload manifest files, and review probes,
                resources, runtime hardening, selectors, and exposure risks
                without a backend roundtrip, database, or account.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            {primaryTool ? (
              <Button asChild>
                <Link href={primaryTool.slug}>Open {primaryTool.name}</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/tools">Explore tools</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-background-muted/70">
          <CardHeader className="gap-3">
            <p className="text-muted font-mono text-xs tracking-[0.24em] uppercase">
              Launch snapshot
            </p>
            <CardTitle>{primaryTool?.name}</CardTitle>
            <CardDescription>
              The first Authos tool is live now and designed for fast local
              review of Kubernetes deploy bundles before they reach CI or
              production.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="border-border bg-card rounded-2xl border p-4">
              <p className="text-muted font-mono text-xs tracking-[0.18em] uppercase">
                Privacy posture
              </p>
              <p className="text-foreground mt-2 text-sm">
                Local analysis by default
              </p>
            </div>
            <div className="border-border bg-card rounded-2xl border p-4">
              <p className="text-muted font-mono text-xs tracking-[0.18em] uppercase">
                Status
              </p>
              <p className="text-foreground mt-2 text-sm">
                {primaryTool?.status}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Why Authos"
          title={siteConfig.mission}
          description="The launch product is meant to feel useful on day one, while still being a clean base for additional Authos tools."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>High-trust workflow</CardTitle>
              <CardDescription>
                The analyzer runs in the browser, keeps raw YAML out of
                localStorage, and redacts exports by default.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Serious Kubernetes checks</CardTitle>
              <CardDescription>
                Production-readiness, reliability, security, networking,
                deprecation, and remediation guidance are all wired into the
                same workspace.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ready to expand</CardTitle>
              <CardDescription>
                The catalog, metadata, and registry model are already in place
                so future Authos tools can ship without reworking the site.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Featured tools"
          title="Current Authos tools"
          description="The catalog is intentionally small at launch: one serious tool, clearly described roadmap placeholders, and no fake product sprawl."
        />
        <div className="grid gap-6">
          {featuredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
    </Container>
  );
}
