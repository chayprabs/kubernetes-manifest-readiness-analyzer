import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ToolCard } from "@/components/tool/tool-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { k8sAnalyzerComingSoonTools } from "@/lib/k8s/landing-content";
import { tools } from "@/lib/tools/registry";
import { toolsMetadata } from "@/lib/site";

export const metadata: Metadata = toolsMetadata;

export default function ToolsPage() {
  return (
    <Container size="page" className="space-y-10">
      <SectionHeading
        eyebrow="Catalog"
        title="Authos tools"
        description="Every registered Authos tool appears here automatically, starting with the Kubernetes readiness workflow."
      />
      <div className="grid gap-6">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      <section id="coming-soon" className="scroll-mt-28 space-y-8">
        <SectionHeading
          eyebrow="Coming soon"
          title="More Kubernetes review tools are planned"
          description="These concepts are not live yet. They are listed here so the current analyzer can link to honest roadmap placeholders instead of fake tool pages."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {k8sAnalyzerComingSoonTools.map((tool) => (
            <Card key={tool.title}>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Coming soon</Badge>
                </div>
                <CardTitle>{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  );
}
