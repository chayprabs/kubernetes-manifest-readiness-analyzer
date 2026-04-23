# Kubernetes Manifest Analyzer

## Summary

The Kubernetes Manifest Analyzer is Authos's first live tool. It is a
browser-first review surface for engineers who want fast, local feedback on
manifest quality before a deploy. It focuses on production-readiness concerns
that are easy to miss in a syntax-only review: probes, resources, security
context, service selectors, exposure, deprecated APIs, and operational
metadata.

It is intentionally narrower than a cluster-integrated policy system. The goal
is fast pre-ship review, not complete admission-controller or runtime-policy
coverage.

## Target Users

- Platform engineers reviewing application manifests before merge or release
- SRE teams doing production-readiness triage
- Application developers shipping workloads to Kubernetes without a deep
  cluster-policy background
- Security-minded reviewers who want local visibility into manifest hardening
  gaps before sharing files more broadly

## Main Workflow

1. Paste YAML, upload one or more manifest files, or load a sample bundle.
2. Choose the target Kubernetes version and analysis profile.
3. Let auto-analyze run, or trigger analysis manually.
4. Review parse blockers first if the bundle is invalid.
5. Review the scorecard, severity counts, findings, relationship issues,
   positive checks, and fix-first suggestions.
6. Copy or download a redacted report when you need to share the review.

## Current Feature List

- Multi-document YAML parsing with friendly parse feedback
- Resource extraction and relationship mapping across Services,
  PodDisruptionBudgets, HPAs, and NetworkPolicies
- Rule categories for reliability, security, networking, operations, schema,
  and API-version review
- Profiles that tune rule severity and noise level
- Namespace filtering for scoped reviews
- Readiness scoring, grade, risk level, positive checks, and prioritized
  fix-first findings
- Fix suggestions in snippet, patch-like, manual, and new-resource formats
- Privacy inspection and redacted exports for Markdown, JSON, and CSV
- Browser worker execution with main-thread fallback
- Sample manifests and fixture-backed test coverage

## Known Limitations

- It is not a live cluster validator. It does not inspect runtime state,
  admission policies, RBAC bindings in-cluster, or controller behavior after
  deployment.
- It does not claim parity with Kubernetes admission controllers, Pod Security
  Standards enforcement, or tools like kube-score, Polaris, or KubeLinter.
- It does not render Helm or Kustomize. Users should analyze rendered output.
- Some findings rely on heuristics rather than complete semantic knowledge.
  Service selector repair suggestions and privacy redaction are examples of
  areas where human review still matters.
- Kubernetes API deprecations are maintained in a local mapping. They are only
  as current as `src/lib/k8s/deprecations.ts`.
- It currently ships as a browser page, not a CI package or CLI.

## Future Roadmap

These are realistic expansion directions, not promises or shipped features.

- Broaden the rule surface for storage, RBAC, workload rollout strategy, and
  more cross-resource checks
- Continue improving fix suggestions so more findings include safer, more
  reviewable remediation templates
- Expand the Authos catalog with related tools already referenced in the site:
  Helm values review, Kustomize output diff review, and a NetworkPolicy review
  workflow
- Consider a reusable analyzer core that could eventually power a non-browser
  CI or CLI flow, without changing the current product claim that the shipped
  page is browser-first

## Product Guardrails

- Keep privacy claims conservative and verifiable.
- Keep limitations visible instead of implying cluster or policy completeness.
- Prefer clearer, lower-noise guidance over speculative findings.
- Keep the browser-first boundary obvious near the editor and export actions,
  not only in supporting docs.
