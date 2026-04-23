# K8s Analyzer Architecture

## Purpose

This document explains how the live Kubernetes analyzer turns raw YAML into a
typed report and UI. If you are changing parsing, rules, scoring, exports, or
the front-end workflow, start here.

The live route is `src/app/tools/kubernetes-manifest-analyzer/page.tsx`, and
the active interactive client component is
`src/components/tool/k8s-analyzer-app.tsx`.

## Pipeline Overview

```text
YAML input
  -> parseK8sYaml()
  -> buildK8sRelationshipGraph()
  -> runK8sRuleEngine()
  -> buildReadinessScorecard()
  -> analyzeK8sPrivacy()
  -> K8sAnalysisReport
  -> UI + exports
```

## End-To-End Flow

### 1. UI input and local settings

`K8sAnalyzerApp` owns the editor state, uploaded file merge behavior, analysis
settings, and result rendering.

- Raw YAML lives in React state as `yamlInput`.
- Remembered settings live in `localStorage` under
  `authos-k8s-analyzer-settings`.
- Raw YAML is not persisted to `localStorage`.
- The component prefers worker-based analysis and falls back to direct
  in-browser execution if the worker cannot run.

### 2. Parsing and normalization

Entry point: `src/lib/k8s/parser.ts`

`parseK8sYaml(raw)`:

- uses `yaml.parseAllDocuments()` to parse multi-document YAML
- records line and column information through `LineCounter`
- normalizes Kubernetes objects through `normalizeK8sDocument()`
- returns a `K8sParseResult` containing:
  - normalized documents
  - errors and warnings
  - empty-document metadata
  - input size and document counts

Important behavior:

- parse warnings become report warnings
- fatal parse errors stop runtime rule execution later in the pipeline
- oversized input becomes a warning, not an automatic hard failure

### 3. Resource extraction and relationships

Entry point: `src/lib/k8s/relationships.ts`

`buildK8sRelationshipGraph(documents)`:

- extracts typed resources through `extractK8sResources()`
- groups workloads, Services, PDBs, HPAs, and NetworkPolicies
- builds explicit relationships such as:
  - `service-targets`
  - `pod-disruption-budget-targets`
  - `horizontal-pod-autoscaler-targets`
  - `network-policy-targets`
- records relationship issues such as:
  - Service selector matches nothing
  - PDB selector matches nothing
  - HPA target not found
  - Deployment selector mismatch

The relationship graph is important because some user-visible findings come
from cross-resource drift rather than a single manifest in isolation.

### 4. Rules and report assembly

Entry point: `src/lib/k8s/rule-engine.ts`

`runK8sRuleEngine()`:

- resolves the selected profile and derived options
- optionally filters the relationship graph by namespace
- converts parse diagnostics into schema findings
- skips runtime rule execution when fatal parse errors exist
- executes registered rules from `src/lib/k8s/rules/index.ts`
- deduplicates and sorts findings
- enriches findings with normalized fix suggestions
- builds the initial `K8sAnalysisReport`

Rule categories currently come from:

- `rules/security`
- `rules/networking`
- `rules/operations`
- `rules/api-version`
- `rules/schema`
- `rules/reliability`
- `rules/basic`

### 5. Scoring

Entry point: `src/lib/k8s/scoring.ts`

`buildReadinessScorecard()` consumes findings plus parse and relationship
context and produces:

- `readinessScore`
- `readinessGrade`
- `riskLevel`
- `headline`
- `summary`
- `nextSteps`
- `categoryScores`
- `resourceSummary`
- `fixFirstFindings`
- `positiveChecks`
- `scoreBreakdown`

The scoring model starts from `100`, subtracts weighted penalties by severity
and category, caps category deductions, applies profile multipliers, and can
award a small positive bonus for healthy signals such as probes, resources,
PDBs, hardened securityContext, and ingress TLS.

### 6. Privacy summary

Entry point: `src/lib/k8s/privacy.ts`

`analyzeK8sPrivacy(raw, parseResult)` walks parsed documents first, then falls
back to raw-text scanning if needed. It produces `K8sPrivacySummary`, which is
attached to the report before the UI renders it.

Privacy signals include:

- Secret `data`
- Secret `stringData`
- literal sensitive env vars
- sensitive annotations
- cloud credential patterns
- private key markers
- internal hostnames

### 7. UI and exports

UI components:

- `K8sAnalyzerApp` orchestrates analysis
- `K8sResultsDashboard` renders findings, resources, relationships, fixes, and
  JSON
- `K8sReportExportMenu` handles copy and download actions

Export helpers:

- `buildK8sMarkdownExport()`
- `buildK8sJsonExportObject()`
- `buildK8sCsvFindingsExport()`

These exports rely on privacy-aware helpers so visible and exported content is
redacted by default.

## Browser-Only Design

The analyzer is intentionally browser-only today.

- No backend manifest upload path exists in the current product.
- No server database, auth boundary, or remote AI call is required for
  analysis.
- Raw YAML is kept in browser memory and may be copied to a Web Worker, but it
  does not leave the browser process through network requests in the current
  implementation.
- Export downloads are generated in-browser through Blob URLs.

This does not mean "fully isolated from the user's environment" in a security
research sense. Browser extensions, developer tools, and the local machine are
still part of the user's trust boundary.

## Worker Design

Worker files:

- `src/lib/k8s/analyzer-worker-client.ts`
- `src/workers/k8s-analyzer.worker.ts`

How it works:

1. `K8sAnalyzerApp` asks `K8sAnalyzerWorkerClient` to analyze the current draft.
2. The client posts an `analyze` message with raw YAML and options.
3. The worker calls `analyzeK8sManifests()` and streams progress updates.
4. The worker returns either a `success` or `error` message.
5. If the worker is unavailable or crashes, the UI falls back to direct
   main-thread analysis for the current browser session.

Important constraints:

- only one active worker request is supported per client instance
- new requests cancel older ones
- aborted analysis is treated as a recoverable worker error
- progress messages use the same typed `K8sAnalysisProgressUpdate` contract as
  the main thread

## Core Types And Data Flow

The most important contracts live in `src/lib/k8s/types.ts`.

- `K8sParseResult`: normalized documents plus parse diagnostics
- `K8sRelationshipGraph`: extracted resources and cross-resource links
- `K8sRuleContext`: the data every rule sees
- `K8sFinding`: the normalized finding shape rendered in UI and exports
- `K8sFixSuggestion`: structured remediation guidance
- `K8sAnalysisReport`: the final report object used by the dashboard and export
  builders
- `K8sAnalyzerProfile` and `K8sAnalyzerOptions`: user-selected behavior knobs

The intended data direction is one-way:

`raw YAML` -> `parse result` -> `relationship graph` -> `rule context` ->
`findings` -> `score/privacy summary` -> `analysis report` -> `UI/export`

Try not to bypass this pipeline by letting UI components invent report fields
on their own. If a value is part of product behavior, it usually belongs in the
typed report.

## Important Maintenance Notes

- Add or change rules by editing a category file under `src/lib/k8s/rules/`
  and registering it in the category index plus `rules/index.ts`.
- Update Kubernetes version support in `src/lib/k8s/deprecations.ts`, then
  cover it with rule tests and snapshot updates if user-visible output changes.
- Prefer adding behavior to the typed pipeline instead of embedding analyzer
  logic directly in React components.
- The active implementation is `K8sAnalyzerApp`. `manifest-analyzer-shell.tsx`
  is an older unused shell and should not be treated as the source of truth for
  current behavior.
