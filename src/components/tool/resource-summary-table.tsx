import { EmptyState } from "@/components/tool/empty-state";
import { CopyButton } from "@/components/tool/copy-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ResourceSummaryRow = {
  id: string;
  namespaceLabel: string;
  kind: string;
  name: string;
  relationships: readonly string[];
  findingCount: number;
  issueCount: number;
};

type ResourceSummaryTableProps = {
  rows: readonly ResourceSummaryRow[];
  copyValue?: string;
};

export function ResourceSummaryTable({
  rows,
  copyValue,
}: ResourceSummaryTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            Review which resources were analyzed, how they connect to other
            objects, and where findings are concentrated.
          </CardDescription>
        </div>
        {copyValue ? <CopyButton value={copyValue} /> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!rows.length ? (
          <EmptyState
            title="No resources found"
            description="The current report does not contain parsed Kubernetes resources yet."
          />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="border-border bg-background-muted/25 grid gap-3 rounded-2xl border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{row.kind}</Badge>
                    {row.issueCount > 0 ? (
                      <Badge variant="warning">
                        {row.issueCount} broken relationship
                        {row.issueCount === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground text-sm font-semibold">
                      {row.name}
                    </p>
                    <p className="text-muted text-sm">{row.namespaceLabel}</p>
                  </div>
                  <p className="text-muted text-sm leading-6">
                    {row.relationships.length > 0
                      ? row.relationships.join(" | ")
                      : "No matched Service, PDB, HPA, or NetworkPolicy relationships were found."}
                  </p>
                  <p className="text-foreground text-sm font-medium">
                    {row.findingCount} finding{row.findingCount === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[860px]">
                <div className="text-muted grid grid-cols-[1.1fr_0.9fr_1.2fr_2.2fr_0.8fr] gap-4 px-4 py-3 text-xs font-semibold tracking-[0.18em] uppercase">
                  <span>Namespace</span>
                  <span>Kind</span>
                  <span>Name</span>
                  <span>Relationships</span>
                  <span>Findings</span>
                </div>

                <div className="grid gap-3">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="border-border bg-background-muted/25 grid grid-cols-[1.1fr_0.9fr_1.2fr_2.2fr_0.8fr] gap-4 rounded-2xl border px-4 py-4"
                    >
                      <div className="space-y-2">
                        <p className="text-foreground text-sm">{row.namespaceLabel}</p>
                        {row.issueCount > 0 ? (
                          <Badge variant="warning">
                            {row.issueCount} broken
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-foreground text-sm">{row.kind}</p>
                      <p className="text-foreground text-sm font-medium break-words">
                        {row.name}
                      </p>
                      <p className="text-muted text-sm leading-6">
                        {row.relationships.length > 0
                          ? row.relationships.join(" | ")
                          : "None"}
                      </p>
                      <p className="text-foreground text-sm font-medium">
                        {row.findingCount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
