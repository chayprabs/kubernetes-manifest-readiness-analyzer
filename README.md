# Authos

Authos is a browser-first developer tools site built on Next.js. The current
live product is a Kubernetes Manifest Analyzer that reviews pasted or uploaded
YAML for production-readiness, security, networking, API-version, and
operations risks without requiring a backend roundtrip.

The repository is intentionally structured as a multi-tool foundation rather
than a one-off page. Tool metadata lives in a central registry, the catalog is
registry-driven, and the Kubernetes analyzer doubles as the reference
implementation for how future Authos tools should be built.

## Product Overview

- Browser-first workflows: the analyzer runs parsing, relationship building,
  rules, scoring, privacy review, and report generation in the browser.
- Local-first privacy posture: raw manifest text stays in browser memory, and
  report exports are redacted by default.
- Registry-driven expansion: new tools are expected to be added through
  `src/lib/tools/registry.ts` plus a route under `src/app/tools/`.
- Typed internal contracts: analyzer internals are modeled with explicit parse,
  relationship, rule, scoring, privacy, and report types.

## Local Setup

Use a current Node.js version compatible with Next.js 16 and install
dependencies with `pnpm` or `npm`.

With `pnpm`:

```bash
pnpm install
pnpm dev
```

With `npm`:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` after the dev server starts.

If you want production-like metadata locally, copy `.env.example` to
`.env.local` and set `NEXT_PUBLIC_SITE_URL`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server. |
| `pnpm build` | Build the production app. |
| `pnpm start` | Serve the production build locally. |
| `pnpm lint` | Run ESLint with warnings treated as failures. |
| `pnpm typecheck` | Run TypeScript in no-emit mode. |
| `pnpm test` | Run the Vitest unit and snapshot suite. |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm test:e2e` | Run Playwright end-to-end tests. |
| `pnpm test:ci` | Run lint, typecheck, unit tests, e2e tests, and build in one pass. |
| `pnpm format` | Format the repo with Prettier. |

## Project Structure

```text
.
|-- docs/
|   |-- engineering/
|   |-- launch/
|   `-- product/
|-- src/
|   |-- app/                    # Next.js App Router pages and route metadata
|   |-- components/
|   |   |-- layout/             # Site shell, nav, footer, containers
|   |   |-- tool/               # Tool-specific UI components
|   |   `-- ui/                 # Shared UI primitives
|   |-- lib/
|   |   |-- k8s/                # Analyzer pipeline, rules, exports, fixtures, tests
|   |   |-- privacy/            # Shared redaction and secret-detection helpers
|   |   |-- tools/              # Tool registry
|   |   `-- site.ts             # Site-wide metadata helpers and config
|   `-- workers/                # Web Worker entrypoints
|-- tests/
|   `-- e2e/                    # Playwright coverage for public flows
|-- AGENTS.md                   # Repo-specific instructions for coding agents
|-- next.config.ts              # Next.js config
|-- package.json                # Scripts and dependencies
`-- vitest.config.ts            # Vitest config
```

## Kubernetes Analyzer Architecture At A Glance

The analyzer pipeline follows a predictable sequence:

1. `K8sAnalyzerApp` collects YAML input and local analysis settings.
2. `analyzeK8sManifests()` parses YAML into normalized documents.
3. `buildK8sRelationshipGraph()` extracts resources and links Services, PDBs,
   HPAs, and NetworkPolicies to workloads.
4. `runK8sRuleEngine()` converts parse diagnostics into schema findings, runs
   the registered rules, enriches fixes, and produces a typed report.
5. `buildReadinessScorecard()` scores the report and produces summary text,
   positive checks, and fix-first prioritization.
6. `analyzeK8sPrivacy()` attaches privacy signals so UI and exports can redact
   sensitive output.
7. `K8sResultsDashboard` and export helpers render or copy the report.

For the full maintenance guide, start with
[`docs/engineering/k8s-analyzer-architecture.md`](docs/engineering/k8s-analyzer-architecture.md).

## Documentation Map

- [`docs/product/kubernetes-manifest-analyzer.md`](docs/product/kubernetes-manifest-analyzer.md)
  explains the product, users, workflow, limitations, and roadmap.
- [`docs/engineering/k8s-analyzer-architecture.md`](docs/engineering/k8s-analyzer-architecture.md)
  explains the analyzer pipeline, worker model, and data flow.
- [`docs/engineering/rule-authoring-guide.md`](docs/engineering/rule-authoring-guide.md)
  explains how to add or change analyzer rules safely.
- [`docs/engineering/privacy-and-redaction.md`](docs/engineering/privacy-and-redaction.md)
  documents privacy boundaries, redaction, and export behavior.
- [`docs/engineering/adding-a-new-tool.md`](docs/engineering/adding-a-new-tool.md)
  explains how to extend Authos into a larger tool suite.
- [`docs/launch/kubernetes-analyzer-launch-checklist.md`](docs/launch/kubernetes-analyzer-launch-checklist.md)
  captures the release gate, QA checks, privacy checks, and rollback plan for
  the first tool launch.

## Deployment Notes

- Set `NEXT_PUBLIC_SITE_URL` in each deployed environment. If it is missing,
  canonical metadata falls back to `https://authos.example`, which is fine for
  local development but wrong for production.
- `.env.example` contains the only public environment variables currently
  recognized by the app. No server secrets are required for the core
  Kubernetes analyzer.
- The current app has no backend database, no auth layer, and no server-side
  manifest processing requirement. The Kubernetes analyzer is designed to work
  fully in the browser.
- Web Worker support is preferred for analysis responsiveness, but the analyzer
  falls back to main-thread execution when the worker cannot start.
- The main public routes that should remain healthy are `/`, `/tools`,
  `/tools/kubernetes-manifest-analyzer`, and `/privacy`.
- `typedRoutes` is enabled in `next.config.ts`, so route strings used in code
  should stay valid Next.js route literals.

### Vercel

1. Import the repository into Vercel.
2. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
3. Leave analytics env vars empty unless you have a reviewed safe endpoint.
4. Deploy with the default Next.js build command: `pnpm build`.

### Generic Node Hosting

1. Install dependencies with `pnpm install`.
2. Set `NEXT_PUBLIC_SITE_URL` in the environment.
3. Build with `pnpm build`.
4. Run with `pnpm start`.

This launch does not require a backend, database, auth provider, or secret
management service to make the analyzer work end-to-end.

## Known Limits

- The analyzer is a static manifest review tool, not a live cluster validator.
- It does not claim admission-controller parity with Kubernetes or third-party
  policy engines.
- It analyzes rendered YAML only; it does not render Helm charts or Kustomize
  overlays.
- API deprecations are maintained in a local table and must be updated
  intentionally as Kubernetes support moves forward.
