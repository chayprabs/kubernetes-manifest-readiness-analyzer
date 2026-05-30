# Project Decisions (Resolved)

This document records answers to open questions from the repository archaeology phase.
Values were verified against the codebase and public GitHub metadata on **2026-05-19**.

## Production URL

| Question | Answer |
| --- | --- |
| Is production deployed? | **Not yet** (as of GitHub API check on 2026-04-23). |
| Evidence | `homepage: null`, `has_pages: false` on [chayprabs/kubernetes-manifest-readiness-analyzer](https://github.com/chayprabs/kubernetes-manifest-readiness-analyzer). |
| Runtime fallback | `https://k8s-readiness.example` when `NEXT_PUBLIC_SITE_URL` is unset (`src/lib/site.ts`). |
| Recommended first production value | `https://kubernetes-manifest-readiness-analyzer.vercel.app` (Vercel default for this repo name). Alternate: GitHub Pages URL in `src/lib/deployment.ts`. |

Set `NEXT_PUBLIC_SITE_URL` in the host dashboard after the first deploy. Copy `.env.example` to `.env.local` for local dev.

## `.env.example`

| Question | Answer |
| --- | --- |
| Why was it missing? | Never committed; `.gitignore` ignored all `.env*` files. |
| Fix | `.env.example` added; `.gitignore` now includes `!.env.example`. |

## HTML export

| Question | Answer |
| --- | --- |
| Intended or abandoned? | **Intended** — `buildK8sHtmlExport()` existed but was not wired in the UI. |
| Fix | **Download HTML** added to `K8sReportExportMenu`. |

## Repository naming

| Name | Role |
| --- | --- |
| `kubernetes-manifest-readiness-analyzer` | GitHub repository / clone folder name. |
| `k8s-readiness` | npm package name and product brand (`package.json`). |

**Source of truth:** the product is **K8s Readiness** (multi-tool site). The repo name reflects the launch tool and SEO; they do not need to match.

## Roadmap tool priority

All three follow-on tools shipped live in K8s Readiness **1.0.0**. The roadmap module
(`src/lib/tools/roadmap.ts`) is intentionally empty; new concepts should register
in `src/lib/tools/registry.ts` when routes exist.

## Analytics endpoint

| Question | Answer |
| --- | --- |
| Provisioned? | **No** — no endpoint in repo or GitHub metadata. |
| Default behavior | Strict no-op (`src/lib/analytics/client.ts`). |
| Enable | Set `NEXT_PUBLIC_ANALYTICS_ANALYTICS_PROVIDER=custom-endpoint` and `NEXT_PUBLIC_ANALYTICS_ANALYTICS_ENDPOINT` after security review. |

## Primary navigation

| Question | Answer |
| --- | --- |
| Registry-driven? | **Yes** — `getPrimaryNavLinks()` in `src/lib/tools/nav.ts` builds Tools + live registry tools + Privacy. |
| Manual step for new tools | Set `status: "Live"` in the registry; nav updates automatically. |

## Kubernetes version maintenance

| Question | Answer |
| --- | --- |
| Owner | Maintainers update `supportedKubernetesTargetVersions` and `kubernetesApiDeprecations` in `src/lib/k8s/deprecations.ts`. |
| Cadence | When Kubernetes ships a new minor release used by target users, or when deprecations change. |
| Current range | 1.24–1.34 (default selector uses latest entry). |

See [`kubernetes-version-maintenance.md`](./kubernetes-version-maintenance.md).
