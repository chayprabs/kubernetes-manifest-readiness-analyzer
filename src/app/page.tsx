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
            <Badge variant="info">Design system foundation</Badge>
            <div className="space-y-4">
              <CardTitle className="max-w-3xl text-4xl sm:text-5xl">
                Authos is building serious browser-first tooling for engineering
                teams.
              </CardTitle>
              <CardDescription className="max-w-2xl text-lg">
                The first release focuses on Kubernetes manifest review so teams
                can inspect production-readiness, runtime safety, and deployment
                hygiene inside a fast, bookmarkable workspace.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Button asChild>
              <Link href="/tools">Explore tools</Link>
            </Button>
            {primaryTool ? (
              <Button asChild variant="outline">
                <Link href={primaryTool.slug}>Open {primaryTool.name}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-background-muted/70">
          <CardHeader className="gap-3">
            <p className="text-muted font-mono text-xs tracking-[0.24em] uppercase">
              First registered tool
            </p>
            <CardTitle>{primaryTool?.name}</CardTitle>
            <CardDescription>{primaryTool?.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="border-border bg-card rounded-2xl border p-4">
              <p className="text-muted font-mono text-xs tracking-[0.18em] uppercase">
                Category
              </p>
              <p className="text-foreground mt-2 text-sm">
                {primaryTool?.category}
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
          eyebrow="Launch focus"
          title={siteConfig.mission}
          description="The shell, registry, metadata, and primitives are designed so new tools can arrive without rewriting the overall site."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Registry-driven structure</CardTitle>
              <CardDescription>
                Tool definitions now live in one place so catalog pages, nav,
                and metadata can scale cleanly as Authos grows.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Browser-first workflows</CardTitle>
              <CardDescription>
                Core tools are framed for local processing whenever possible,
                keeping sensitive engineering inputs closer to the developer.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Neutral design system</CardTitle>
              <CardDescription>
                The interface is intentionally compact, trustworthy, and easy to
                redesign once the final brand is locked.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Featured tools"
          title="Registered tools from the Authos catalog"
          description="This section is powered by the registry, so future tools can appear here and on the catalog page from the same source of truth."
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
