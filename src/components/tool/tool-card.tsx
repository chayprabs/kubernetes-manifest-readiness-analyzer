import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ToolDefinition } from "@/lib/tools/registry";

type ToolCardProps = {
  tool: ToolDefinition;
};

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Card className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{tool.category}</Badge>
          <Badge variant="secondary">{tool.status}</Badge>
        </div>
        <div className="space-y-3">
          <CardTitle className="text-2xl">{tool.name}</CardTitle>
          <CardDescription className="max-w-2xl text-base">
            {tool.shortDescription}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {tool.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <div>
          <Button asChild>
            <Link href={tool.slug}>View tool page</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="md:border-border grid gap-4 pt-6 md:border-l">
        <div className="border-border bg-background-muted/60 rounded-2xl border px-4 py-3">
          <p className="text-muted text-xs font-medium tracking-[0.18em] uppercase">
            Short name
          </p>
          <p className="text-foreground mt-2 text-sm leading-6">
            {tool.shortName}
          </p>
        </div>
        <div className="border-border bg-background-muted/60 rounded-2xl border px-4 py-3">
          <p className="text-muted text-xs font-medium tracking-[0.18em] uppercase">
            Audience
          </p>
          <p className="text-foreground mt-2 text-sm leading-6">
            {tool.audiences.join(", ")}
          </p>
        </div>
        <div className="border-border bg-background-muted/60 rounded-2xl border px-4 py-3">
          <p className="text-muted text-xs font-medium tracking-[0.18em] uppercase">
            Description
          </p>
          <p className="text-foreground mt-2 text-sm leading-6">
            {tool.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
