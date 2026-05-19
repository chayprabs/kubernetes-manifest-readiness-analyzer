import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ToolCard } from "@/components/tool/tool-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { tools } from "@/lib/tools/registry";
import { toolsMetadata } from "@/lib/site";

export const metadata: Metadata = toolsMetadata;

export default function ToolsPage() {
  return (
    <Container size="page" className="space-y-10">
      <SectionHeading
        eyebrow="Catalog"
        title="Authos tools"
        description="Every live Authos tool is registered here and runs locally in your browser."
      />
      <div className="grid gap-6">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </Container>
  );
}
