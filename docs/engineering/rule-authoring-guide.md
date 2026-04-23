# Rule Authoring Guide

## Goal

This guide is the shortest path for adding or changing a Kubernetes analyzer
rule without reading the entire codebase.

## Rule Lifecycle

Every rule follows the same basic path:

1. Read from `K8sRuleContext`
2. Return one or more `K8sFinding` objects
3. Get normalized, deduplicated, sorted, and fix-enriched by the rule engine
4. Influence scoring, summaries, UI, and exports through the final report

## Where Rules Live

Rules are organized by category under `src/lib/k8s/rules/`:

- `reliability/`
- `security/`
- `networking/`
- `operations/`
- `schema/`
- `api-version/`
- `basic.ts`

To add a new rule:

1. Create a new file in the most appropriate category directory.
2. Export the rule from that category's `index.ts`.
3. Make sure the category is included by `src/lib/k8s/rules/index.ts`.
4. Add or update tests in the matching test file under `src/lib/k8s/__tests__/`.

## Minimal Rule Skeleton

```ts
import type { K8sRule } from "@/lib/k8s/types";
import { createWorkloadFinding } from "@/lib/k8s/rules/reliability/shared";

export const exampleRule: K8sRule = {
  id: "example-rule",
  title: "Example rule title",
  description: "Explain what risky behavior this rule checks.",
  category: "reliability",
  defaultSeverity: "medium",
  run(context) {
    return context.workloads.flatMap((workload) => {
      const shouldFlag = false;

      if (!shouldFlag) {
        return [];
      }

      return [
        createWorkloadFinding(context, workload, {
          ruleId: "example-rule",
          idSuffix: workload.name,
          title: "Example rule title",
          message: `Deployment "${workload.name}" needs review.`,
          severity: "medium",
          category: "reliability",
          whyItMatters: "Explain the operational risk.",
          recommendation: "Tell the user what to change next.",
        }),
      ];
    });
  },
};
```

Use the shared helpers when possible:

- `createWorkloadFinding()`
- `createDocumentFinding()`
- `createResourceFinding()`
- resource and selector helpers in category-specific `shared.ts` files

Those helpers keep `resourceRef`, `location`, and IDs consistent.

## Required Finding Fields

Rules ultimately produce `K8sFinding` objects. The engine expects these fields
to be present:

- `id`: stable per finding instance, usually `ruleId` plus a resource-specific
  suffix
- `ruleId`: the rule's permanent identifier
- `title`: short finding label used in headings and fix-first panels
- `message`: direct statement of the problem
- `severity`: one of `critical`, `high`, `medium`, `low`, or `info`
- `category`: one of the analyzer categories
- `resourceRef`: the affected document or resource
- `whyItMatters`: why the issue matters in production
- `recommendation`: the next action the user should take

Optional but strongly recommended when available:

- `location`: especially `path`, so the UI can point at the affected YAML area
- `fix`: structured remediation guidance
- `docsUrl`: external docs when the migration or behavior is subtle
- `confidence`: defaults to `high`, but lower it when the rule is heuristic

Notes:

- `createFinding()` automatically fills `suggestion` from `recommendation`.
- The rule engine may override severity through profile settings.
- If `strictSecurity` is enabled, security findings can be elevated by the
  engine even if the rule returned a lower severity.

## Severity Guidelines

Use severity for user impact, not for how clever the rule feels.

- `critical`: use for hard blockers or conditions that make the report unsafe
  to trust without immediate fixes. Fatal parse diagnostics live here. Runtime
  rules should use this sparingly.
- `high`: use for issues likely to break production behavior or leave the
  workload materially unsafe, such as missing readiness probes on app
  workloads, severe exposure, or broken selector intent.
- `medium`: use for meaningful production risk that is important but not
  immediately blocking in every environment.
- `low`: use for hygiene, metadata, or review-quality improvements that still
  help production operations.
- `info`: use for opt-in, low-risk educational guidance. Remember that info
  findings are hidden by default in most profiles.

## Confidence Guidelines

- `high`: deterministic checks with clear source data
- `medium`: likely correct, but based on incomplete context or heuristics
- `low`: advisory only; useful as a prompt for human review, not a strong claim

Examples of lower-confidence cases:

- inferring the intended backend for a Service selector repair
- large-object warnings that do not know the final admission path
- uncommon-kind guidance for custom resources

## Fix Suggestion Guidelines

Fixes are guidance, not auto-remediation.

Prefer these fix types:

- `yaml-snippet`: best for adding a missing block such as probes, resources, or
  TLS
- `strategic-merge-patch-like`: best for patching an existing resource in a
  reviewable way
- `json-patch-like`: best when you want a precise field replacement
- `new-resource`: best when the fix is a separate object such as a
  PodDisruptionBudget
- `manual-instruction`: best when the analyzer cannot safely infer exact YAML

Rules for good fixes:

- Never include real secrets or repeat sensitive literal values.
- Mark `safeToAutoApply` conservatively. Most current fixes should stay `false`.
- Write `riskNote` like a reviewer warning, not marketing copy.
- Use placeholders when the real value depends on application context.
- Include `yamlPath` when possible so the user knows where the suggestion
  belongs.
- If a fix would be risky without strong context, prefer `manual-instruction`
  over a too-confident patch.

If you return a legacy fix shape with only `summary` and `snippet`, the
normalizer will convert it, but new rules should prefer the typed fix objects.

## Testing Requirements

At minimum, every new rule should have focused unit coverage.

Recommended checklist:

1. Add or update a category test in `src/lib/k8s/__tests__/`.
2. Cover at least one positive case and one non-triggering case.
3. Assert on `ruleId`, severity, category, and the core recommendation or fix.
4. If the rule depends on profiles, namespace filtering, or target Kubernetes
   version, test those branches explicitly.
5. If the rule changes user-facing aggregate output in an important example,
   review the golden snapshots and update them intentionally.

Use the test layers that fit the change:

- unit rule tests for rule logic
- fixture scenario tests for realistic YAML bundles
- golden report snapshots for broad report changes
- export snapshots if the new finding materially changes Markdown, JSON, or CSV

Keep tests deterministic:

- do not depend on wall-clock time
- use the shared fixture helpers when snapshotting exports or full reports
- keep snapshots compact and reviewable rather than dumping the whole raw report

## Updating Deprecation-Driven Rules

If your rule depends on Kubernetes version cutoffs:

1. Update `src/lib/k8s/deprecations.ts`
2. Verify severity behavior at boundary versions
3. Update `schema-api-version-operations.test.ts`
4. Review golden or export snapshots if the sample outputs change

## Rule Authoring Anti-Patterns

- Do not put heavy analyzer logic directly inside React components.
- Do not invent your own ad hoc finding shape outside `createFinding()`.
- Do not emit noisy low-confidence findings at `high` severity.
- Do not generate fixes that look automatically safe when they are not.
- Do not assume admission-controller completeness or live-cluster knowledge.
