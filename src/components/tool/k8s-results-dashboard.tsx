"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FileCode2, LoaderCircle, ShieldCheck } from "lucide-react";
import { findingCategories, getFindingSeverityRank } from "@/lib/k8s/findings";
import type {
  K8sAnalysisReport,
  K8sExtractedResource,
  K8sFinding,
  K8sParseError,
  K8sRelationship,
  K8sRelationshipGraph,
  K8sRelationshipIssue,
} from "@/lib/k8s/types";
import { buildResourceSummaryCopy } from "@/lib/k8s/report-export";
import {
  formatK8sNamespaceLabel,
  formatK8sRelationshipTypeLabel,
  formatK8sResourceLabel,
  getK8sObjectIdentityKey,
} from "@/components/tool/k8s-dashboard-helpers";
import { CopyButton } from "@/components/tool/copy-button";
import { EmptyState } from "@/components/tool/empty-state";
import {
  defaultFindingFilterState,
  FindingFilters,
  type FindingFilterState,
} from "@/components/tool/finding-filters";
import { FindingsList } from "@/components/tool/findings-list";
import { FixFirstPanel } from "@/components/tool/fix-first-panel";
import { FixesTab } from "@/components/tool/fixes-tab";
import { K8sScoreSummary } from "@/components/tool/k8s-score-summary";
import { PositiveChecksPanel } from "@/components/tool/positive-checks-panel";
import {
  ResourceSummaryTable,
  type ResourceSummaryRow,
} from "@/components/tool/resource-summary-table";
import { SeveritySummaryCards } from "@/components/tool/severity-summary-cards";
import { SensitiveDataWarning } from "@/components/tool/sensitive-data-warning";
import { CategoryBreakdown } from "@/components/tool/category-breakdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type K8sResultsDashboardProps = {
  report: K8sAnalysisReport | null;
  reportJson: string;
  redactVisibleOutput: boolean;
  hasInput: boolean;
  isAnalyzing: boolean;
  analysisMessage: string;
  stale: boolean;
  activeTab: string;
  onActiveTabChange: (value: string) => void;
  focusSearchRequestKey?: number;
  focusResultsRequestKey?: number;
  onAnalyzeCurrentDraft?: () => void;
  onFocusManifestInput?: () => void;
  onLoadStarterSample?: () => void;
};

type RelationshipSection = {
  id: string;
  title: string;
  description: string;
  items: readonly RelationshipSectionItem[];
  emptyDescription: string;
};

type RelationshipSectionItem = {
  id: string;
  sourceLabel: string;
  namespaceLabel: string;
  targets: readonly string[];
  issues: readonly string[];
  status: "connected" | "broken" | "unmatched";
};

export function K8sResultsDashboard({
  report,
  reportJson,
  redactVisibleOutput,
  hasInput,
  isAnalyzing,
  analysisMessage,
  stale,
  activeTab,
  onActiveTabChange,
  focusSearchRequestKey = 0,
  focusResultsRequestKey = 0,
  onAnalyzeCurrentDraft,
  onFocusManifestInput,
  onLoadStarterSample,
}: K8sResultsDashboardProps) {
  const [filters, setFilters] = useState<FindingFilterState>(
    defaultFindingFilterState,
  );
  const [rawJsonExpanded, setRawJsonExpanded] = useState(false);
  const findingsSearchInputId = useId();
  const resultsRegionRef = useRef<HTMLDivElement | null>(null);
  const findingsSearchInputRef = useRef<HTMLInputElement | null>(null);

  const lowConfidenceCount = useMemo(
    () =>
      report?.findings.filter((finding) => finding.confidence === "low")
        .length ?? 0,
    [report],
  );

  const namespaceOptions = useMemo(() => {
    if (!report) {
      return [];
    }

    const namespaces = new Set<string>();
    let hasClusterScopedItems = false;

    for (const resource of report.relationshipGraph.resources) {
      if (resource.namespace) {
        namespaces.add(resource.namespace);
      } else {
        hasClusterScopedItems = true;
      }
    }

    for (const finding of report.findings) {
      if (finding.resourceRef.namespace) {
        namespaces.add(finding.resourceRef.namespace);
      } else {
        hasClusterScopedItems = true;
      }
    }

    const options = [...namespaces]
      .sort((left, right) => left.localeCompare(right))
      .map((namespace) => ({
        value: namespace,
        label: namespace,
      }));

    return hasClusterScopedItems
      ? [{ value: "__cluster__", label: "Cluster-scoped" }, ...options]
      : options;
  }, [report]);

  const resourceKindOptions = useMemo(() => {
    if (!report) {
      return [];
    }

    const kinds = new Set<string>();

    for (const resource of report.relationshipGraph.resources) {
      kinds.add(resource.kind);
    }

    for (const finding of report.findings) {
      kinds.add(finding.resourceRef.kind ?? "Unknown");
    }

    return [...kinds].sort((left, right) => left.localeCompare(right));
  }, [report]);

  const filteredFindings = useMemo(() => {
    if (!report) {
      return [];
    }

    const search = filters.search.trim().toLowerCase();

    return report.findings.filter((finding) => {
      if (filters.severity !== "all" && finding.severity !== filters.severity) {
        return false;
      }

      if (filters.category !== "all" && finding.category !== filters.category) {
        return false;
      }

      if (
        filters.namespace === "__cluster__" &&
        finding.resourceRef.namespace
      ) {
        return false;
      }

      if (
        filters.namespace !== "all" &&
        filters.namespace !== "__cluster__" &&
        finding.resourceRef.namespace !== filters.namespace
      ) {
        return false;
      }

      const resourceKind = finding.resourceRef.kind ?? "Unknown";

      if (
        filters.resourceKind !== "all" &&
        resourceKind !== filters.resourceKind
      ) {
        return false;
      }

      if (filters.warningsOnly && finding.severity === "info") {
        return false;
      }

      if (!search) {
        return true;
      }

      return buildFindingSearchText(finding).includes(search);
    });
  }, [filters, report]);

  const fixableFindings = useMemo(() => {
    if (!report) {
      return [];
    }

    const fixFirstIds = new Map(
      report.fixFirstFindings.map((finding, index) => [finding.id, index]),
    );

    return filteredFindings
      .filter((finding) => finding.fix)
      .sort((left, right) => {
        const leftPriority = fixFirstIds.get(left.id);
        const rightPriority = fixFirstIds.get(right.id);

        if (leftPriority !== undefined || rightPriority !== undefined) {
          return (
            (leftPriority ?? Number.POSITIVE_INFINITY) -
            (rightPriority ?? Number.POSITIVE_INFINITY)
          );
        }

        return (
          getFindingSeverityRank(right.severity) -
          getFindingSeverityRank(left.severity)
        );
      });
  }, [filteredFindings, report]);

  const resourceRows = useMemo(
    () => (report ? buildResourceSummaryRows(report) : []),
    [report],
  );

  const relationshipSections = useMemo(
    () => (report ? buildRelationshipSections(report.relationshipGraph) : []),
    [report],
  );
  const resourceSummaryCopy = useMemo(
    () => buildResourceSummaryCopy(resourceRows),
    [resourceRows],
  );

  useEffect(() => {
    if (!report || focusSearchRequestKey === 0) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      findingsSearchInputRef.current?.focus();
      findingsSearchInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [focusSearchRequestKey, report]);

  useEffect(() => {
    if (!report || focusResultsRequestKey === 0) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      resultsRegionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      resultsRegionRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [focusResultsRequestKey, report]);

  if (!report) {
    if (isAnalyzing) {
      return <ResultsDashboardSkeleton message={analysisMessage} />;
    }

    if (!hasInput) {
      return (
        <EmptyState
          title="Paste Kubernetes YAML to start."
          description="The production-readiness dashboard appears here after a local analysis run."
          icon={<FileCode2 className="h-5 w-5" />}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {onFocusManifestInput ? (
                <Button type="button" onClick={onFocusManifestInput}>
                  Focus editor
                </Button>
              ) : null}
              {onLoadStarterSample ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onLoadStarterSample}
                >
                  Load starter sample
                </Button>
              ) : null}
            </div>
          }
        />
      );
    }

    return (
      <EmptyState
        title="Draft ready for analysis"
        description="Click Analyze to generate a local production-readiness report for the current manifest draft."
        icon={<ShieldCheck className="h-5 w-5" />}
        action={
          onAnalyzeCurrentDraft ? (
            <Button type="button" onClick={onAnalyzeCurrentDraft}>
              Analyze current draft
            </Button>
          ) : null
        }
      />
    );
  }

  const parseIssues = [
    ...report.parseResult.errors,
    ...report.parseResult.warnings,
  ];
  const allFixableFindings = report.findings.filter((finding) => finding.fix);

  return (
    <div
      ref={resultsRegionRef}
      className="space-y-6"
      role="region"
      aria-label="Analysis results"
      tabIndex={-1}
    >
      {stale ? (
        <Alert variant="warning">
          <AlertTitle>Results are older than the current draft</AlertTitle>
          <AlertDescription>
            The manifest changed after the last completed analysis. Run Analyze
            again, or let auto-analyze catch up if the draft is small enough.
          </AlertDescription>
        </Alert>
      ) : null}

      {report.state === "invalid" ? (
        <Alert variant="destructive">
          <AlertTitle>
            Fix parse blockers before trusting runtime advice
          </AlertTitle>
          <AlertDescription>
            The analyzer found fatal YAML or schema issues. Relationship and
            workload checks are incomplete until those blockers are fixed.
          </AlertDescription>
        </Alert>
      ) : null}

      {report.state === "ready" && report.findings.length === 0 ? (
        <Alert variant="success">
          <AlertTitle>
            No production-readiness issues found by these checks
          </AlertTitle>
          <AlertDescription>
            This is not a guarantee of cluster safety. Keep validating rollout
            behavior, access controls, secrets handling, and
            application-specific probe endpoints before release.
          </AlertDescription>
        </Alert>
      ) : null}

      {lowConfidenceCount > 0 ? (
        <Alert variant="info">
          <AlertTitle>Some findings need extra human review</AlertTitle>
          <AlertDescription>
            {lowConfidenceCount} finding
            {lowConfidenceCount === 1 ? " is" : "s are"} marked low confidence.
            Keep extra review on selectors, probes, and migration guidance
            before changing manifests.
          </AlertDescription>
        </Alert>
      ) : null}

      <SensitiveDataWarning privacy={report.privacy} />

      <p className="text-muted text-sm leading-6">
        Static review only; verify against your cluster policies before
        deployment.
      </p>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <K8sScoreSummary report={report} stale={stale} />
        <FixFirstPanel findings={report.fixFirstFindings.slice(0, 3)} />
      </div>

      <SeveritySummaryCards severityCounts={report.severityCounts} />

      <Tabs value={activeTab} onValueChange={onActiveTabChange}>
        <TabsList className="h-auto w-full justify-start">
          <TabsTrigger value="findings">
            Findings ({report.findings.length})
          </TabsTrigger>
          <TabsTrigger value="resources">
            Resources ({report.relationshipGraph.resources.length})
          </TabsTrigger>
          <TabsTrigger value="relationships">
            Relationships ({report.relationshipGraph.relationships.length})
          </TabsTrigger>
          <TabsTrigger value="fixes">
            Fixes ({allFixableFindings.length})
          </TabsTrigger>
          <TabsTrigger value="json">Raw report JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="space-y-6">
          {parseIssues.length > 0 ? (
            <ParseIssuesPanel issues={parseIssues} />
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <FindingFilters
                filters={filters}
                options={{
                  categories: findingCategories,
                  namespaces: namespaceOptions,
                  resourceKinds: resourceKindOptions,
                }}
                matchCount={filteredFindings.length}
                totalCount={report.findings.length}
                searchInputId={findingsSearchInputId}
                searchInputRef={findingsSearchInputRef}
                onChange={setFilters}
                onReset={() => setFilters(defaultFindingFilterState)}
              />

              <FindingsList
                key={[
                  report.findings.length,
                  filteredFindings.length,
                  filters.severity,
                  filters.category,
                  filters.namespace,
                  filters.resourceKind,
                  filters.search,
                  filters.warningsOnly ? "warnings" : "all",
                ].join(":")}
                findings={filteredFindings}
                totalCount={report.findings.length}
                emptyTitle={
                  report.findings.length === 0
                    ? "No findings in this report"
                    : "No findings match the current filters"
                }
                emptyDescription={
                  report.findings.length === 0
                    ? "No production-readiness issues found by these checks. This is not a guarantee of cluster safety."
                    : "Adjust the severity, category, namespace, resource kind, or search filters to widen the view."
                }
              />
            </div>

            <div className="space-y-4">
              <CategoryBreakdown
                categorySummaries={report.categorySummaries}
                categoryScores={report.categoryScores}
              />
              <PositiveChecksPanel positiveChecks={report.positiveChecks} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <ResourceSummaryTable
            rows={resourceRows}
            copyValue={resourceSummaryCopy}
          />
        </TabsContent>

        <TabsContent value="relationships" className="space-y-6">
          {report.relationshipGraph.issues.length > 0 ? (
            <RelationshipIssuesPanel issues={report.relationshipGraph.issues} />
          ) : (
            <Alert variant="success">
              <AlertTitle>
                No tracked relationship breakages detected
              </AlertTitle>
              <AlertDescription>
                Services, PDBs, HPAs, and the selector relationships this tool
                understands resolved without a reported mismatch.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            {relationshipSections.map((section) => (
              <RelationshipSectionCard key={section.id} section={section} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fixes" className="space-y-6">
          <FixesTab
            findings={fixableFindings}
            totalFixCount={allFixableFindings.length}
          />
        </TabsContent>

        <TabsContent value="json">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Raw report JSON</CardTitle>
                <CardDescription>
                  Useful for debugging and power users. Sensitive fields are
                  redacted by default in this view.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={redactVisibleOutput ? "success" : "warning"}>
                  {redactVisibleOutput
                    ? "Visible output redacted"
                    : "Full visible output"}
                </Badge>
                <CopyButton
                  value={reportJson}
                  label="Copy JSON"
                  ariaLabel="Copy raw report JSON"
                  showInlineFeedback
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRawJsonExpanded((value) => !value)}
                >
                  {rawJsonExpanded ? "Collapse JSON" : "Expand JSON"}
                </Button>
                <p className="text-muted text-sm leading-6">
                  Collapsed by default so the rest of the review stays usable.
                  {redactVisibleOutput
                    ? " Redaction is on for this report view."
                    : " Redaction is off, so review before copying or sharing."}
                </p>
              </div>

              {rawJsonExpanded ? (
                <pre className="overflow-x-auto rounded-2xl bg-[#0b1324] p-4 text-sm leading-7 whitespace-pre-wrap text-slate-100">
                  {reportJson}
                </pre>
              ) : (
                <div className="border-border bg-background-muted/30 rounded-2xl border p-4">
                  <p className="text-muted text-sm leading-6">
                    Expand the JSON when you want the current report object for
                    debugging, tests, or deeper technical review.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ParseIssuesPanel({ issues }: { issues: readonly K8sParseError[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parse feedback</CardTitle>
        <CardDescription>
          YAML syntax and schema issues are surfaced here in a friendlier format
          before you review the runtime findings.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {issues.map((issue, index) => {
          const locationLabel = issue.location
            ? `Line ${issue.location.line}, column ${issue.location.column}`
            : issue.documentIndex !== undefined
              ? `Document ${issue.documentIndex + 1}`
              : "Input";

          return (
            <div
              key={`${issue.code}:${index}`}
              className="border-border bg-background-muted/30 grid gap-3 rounded-2xl border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    issue.severity === "error" ? "destructive" : "warning"
                  }
                >
                  {issue.severity}
                </Badge>
                <p className="text-foreground text-sm font-semibold">
                  {locationLabel}
                </p>
              </div>
              <p className="text-foreground text-sm leading-6">
                {issue.message}
              </p>
              {issue.detail ? (
                <p className="text-muted text-sm leading-6">{issue.detail}</p>
              ) : null}
              {issue.path ? (
                <p className="text-muted text-sm">
                  Path <code>{issue.path}</code>
                </p>
              ) : null}
              {issue.snippet ? (
                <pre className="bg-background text-muted overflow-x-auto rounded-2xl p-4 text-sm leading-6 whitespace-pre-wrap">
                  {issue.snippet}
                </pre>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RelationshipIssuesPanel({
  issues,
}: {
  issues: readonly K8sRelationshipIssue[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Broken relationships</CardTitle>
        <CardDescription>
          These links did not resolve cleanly inside the manifest bundle, which
          can cause traffic, disruption-budget, or autoscaling behavior to miss
          the intended workloads.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {issues.map((issue, index) => (
          <div
            key={`${issue.code}:${issue.sourceId}:${index}`}
            className="border-border bg-background-muted/30 grid gap-3 rounded-2xl border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={issue.severity === "error" ? "destructive" : "warning"}
              >
                {issue.severity}
              </Badge>
              <p className="text-foreground text-sm font-semibold">
                {formatK8sResourceLabel(issue.sourceRef)}
              </p>
            </div>
            <p className="text-muted text-sm leading-6">{issue.message}</p>
            {issue.targetRef ? (
              <p className="text-muted text-sm">
                Target:{" "}
                {formatK8sResourceLabel({
                  ...issue.targetRef,
                  documentIndex: -1,
                })}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RelationshipSectionCard({
  section,
}: {
  section: RelationshipSection;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {section.items.length > 0 ? (
          section.items.map((item) => (
            <div
              key={item.id}
              className={[
                "grid gap-3 rounded-2xl border p-4",
                item.status === "broken"
                  ? "border-warning/30 bg-warning/8"
                  : item.status === "connected"
                    ? "border-border bg-background-muted/25"
                    : "border-border bg-background-muted/15",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-semibold">
                    {item.sourceLabel}
                  </p>
                  <p className="text-muted text-sm">{item.namespaceLabel}</p>
                </div>
                <Badge
                  variant={
                    item.status === "broken"
                      ? "warning"
                      : item.status === "connected"
                        ? "success"
                        : "secondary"
                  }
                >
                  {item.status === "broken"
                    ? "Broken"
                    : item.status === "connected"
                      ? "Connected"
                      : "No matched workloads"}
                </Badge>
              </div>

              {item.targets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.targets.map((target) => (
                    <Badge key={target} variant="outline">
                      {target}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-sm leading-6">
                  No matched workloads are shown for this relationship.
                </p>
              )}

              {item.issues.length > 0 ? (
                <div className="grid gap-2">
                  {item.issues.map((issue) => (
                    <p
                      key={issue}
                      className="text-foreground text-sm leading-6"
                    >
                      {issue}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-muted text-sm leading-6">
            {section.emptyDescription}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsDashboardSkeleton({ message }: { message: string }) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 text-sm">
        <LoaderCircle className="text-accent h-4 w-4 animate-spin" />
        <span className="text-foreground">{message}</span>
      </div>
      <Progress value={62} />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function buildFindingSearchText(finding: K8sFinding) {
  return [
    finding.title,
    finding.message,
    finding.whyItMatters,
    finding.recommendation,
    finding.ruleId,
    finding.resourceRef.kind,
    finding.resourceRef.name,
    finding.resourceRef.namespace,
    finding.fix?.title,
    finding.fix?.summary,
    finding.fix?.type === "manual-instruction"
      ? finding.fix.instructions
      : undefined,
    finding.fix?.copyableContent,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function buildResourceSummaryRows(
  report: K8sAnalysisReport,
): ResourceSummaryRow[] {
  const resourceLookup = createResourceLookup(
    report.relationshipGraph.resources,
  );
  const relatedResources = new Map<string, Set<string>>();
  const findingCounts = new Map<string, number>();
  const issueCounts = new Map<string, number>();

  for (const relationship of report.relationshipGraph.relationships) {
    const source = resourceLookup.byId.get(relationship.sourceId);
    const target = resourceLookup.byId.get(relationship.targetId);

    if (!source || !target) {
      continue;
    }

    addMapLabel(
      relatedResources,
      source.id,
      `Targets ${target.kind} ${target.name}`,
    );
    addMapLabel(
      relatedResources,
      target.id,
      `${formatK8sRelationshipTypeLabel(relationship.type)} ${source.name}`,
    );
  }

  for (const issue of report.relationshipGraph.issues) {
    incrementMapCount(issueCounts, issue.sourceId);

    if (issue.targetRef) {
      const targetId = resourceLookup.byRefKey.get(
        getK8sObjectIdentityKey(issue.targetRef),
      );

      if (targetId) {
        incrementMapCount(issueCounts, targetId);
      }
    }
  }

  for (const finding of report.findings) {
    const resourceId = resourceLookup.byRefKey.get(
      getK8sObjectIdentityKey(finding.resourceRef),
    );

    if (resourceId) {
      incrementMapCount(findingCounts, resourceId);
    }
  }

  return [...report.relationshipGraph.resources]
    .sort((left, right) => {
      const namespaceDelta = (left.namespace ?? "").localeCompare(
        right.namespace ?? "",
      );

      if (namespaceDelta !== 0) {
        return namespaceDelta;
      }

      const kindDelta = left.kind.localeCompare(right.kind);

      if (kindDelta !== 0) {
        return kindDelta;
      }

      return left.name.localeCompare(right.name);
    })
    .map((resource) => ({
      id: resource.id,
      namespaceLabel: formatK8sNamespaceLabel(resource.namespace),
      kind: resource.kind,
      name: resource.name,
      relationships: [...(relatedResources.get(resource.id) ?? [])].sort(
        (left, right) => left.localeCompare(right),
      ),
      findingCount: findingCounts.get(resource.id) ?? 0,
      issueCount: issueCounts.get(resource.id) ?? 0,
    }));
}

function buildRelationshipSections(
  graph: K8sRelationshipGraph,
): RelationshipSection[] {
  return [
    {
      id: "services",
      title: "Service to workload mappings",
      description:
        "Each Service should resolve to the workloads its selector intends to expose.",
      items: buildRelationshipSectionItems(
        graph.services,
        graph,
        "service-targets",
      ),
      emptyDescription:
        "No Service resources were available in this manifest set.",
    },
    {
      id: "pdbs",
      title: "PDB to workload mappings",
      description:
        "PodDisruptionBudgets should point at the workloads they protect during voluntary disruption.",
      items: buildRelationshipSectionItems(
        graph.podDisruptionBudgets,
        graph,
        "pod-disruption-budget-targets",
      ),
      emptyDescription:
        "No PodDisruptionBudget resources were available in this manifest set.",
    },
    {
      id: "hpas",
      title: "HPA target mappings",
      description:
        "HorizontalPodAutoscalers should resolve to a concrete workload target.",
      items: buildRelationshipSectionItems(
        graph.horizontalPodAutoscalers,
        graph,
        "horizontal-pod-autoscaler-targets",
      ),
      emptyDescription:
        "No HorizontalPodAutoscaler resources were available in this manifest set.",
    },
    {
      id: "network-policies",
      title: "NetworkPolicy selections",
      description:
        "NetworkPolicies are shown with the workloads selected by their pod selectors.",
      items: buildRelationshipSectionItems(
        graph.networkPolicies,
        graph,
        "network-policy-targets",
      ),
      emptyDescription:
        "No NetworkPolicy resources were available in this manifest set.",
    },
  ];
}

function buildRelationshipSectionItems(
  resources: readonly K8sExtractedResource[],
  graph: K8sRelationshipGraph,
  relationshipType: K8sRelationship["type"],
): RelationshipSectionItem[] {
  return resources
    .map((resource) => {
      const targets = graph.relationships
        .filter(
          (relationship) =>
            relationship.type === relationshipType &&
            relationship.sourceId === resource.id,
        )
        .map((relationship) => formatK8sResourceLabel(relationship.targetRef));
      const issues = graph.issues
        .filter((issue) => issue.sourceId === resource.id)
        .map((issue) => issue.message);

      return {
        id: resource.id,
        sourceLabel: `${resource.kind} ${resource.name}`,
        namespaceLabel: formatK8sNamespaceLabel(resource.namespace),
        targets,
        issues,
        status:
          issues.length > 0
            ? "broken"
            : targets.length > 0
              ? "connected"
              : "unmatched",
      } satisfies RelationshipSectionItem;
    })
    .sort((left, right) => left.sourceLabel.localeCompare(right.sourceLabel));
}

function createResourceLookup(resources: readonly K8sExtractedResource[]) {
  const byId = new Map(resources.map((resource) => [resource.id, resource]));
  const byRefKey = new Map<string, string>();

  for (const resource of resources) {
    const key = getK8sObjectIdentityKey(resource.ref);

    if (!byRefKey.has(key)) {
      byRefKey.set(key, resource.id);
    }
  }

  return {
    byId,
    byRefKey,
  };
}

function addMapLabel(
  map: Map<string, Set<string>>,
  key: string,
  label: string,
) {
  const labels = map.get(key) ?? new Set<string>();
  labels.add(label);
  map.set(key, labels);
}

function incrementMapCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}
