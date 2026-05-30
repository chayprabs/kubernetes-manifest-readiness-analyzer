# K8s Readiness

Browser-first Kubernetes review tools built with Next.js. Analyze manifests, Helm values, Kustomize output, and NetworkPolicies locally in your browser — no cluster connection, no account, and no YAML upload to a server.

**Live tools (on the home page):**

- **Kubernetes Manifest Analyzer** — production-readiness review for rendered manifests
- **Helm Values Checker** — risky `values.yaml` before chart render
- **Kustomize Output Diff Reviewer** — compare rendered overlay output
- **NetworkPolicy Reviewer** — traffic policy posture and allowlist risks

Repository: [github.com/chayprabs/kubernetes-manifest-readiness-analyzer](https://github.com/chayprabs/kubernetes-manifest-readiness-analyzer)

## Local setup

Requires Node.js 20+.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` for correct canonical URLs in development.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | ESLint (warnings fail) |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm test:ci` | Full release gate (lint, typecheck, test, e2e, build) |

## Architecture

- Tool metadata: `src/lib/tools/registry.ts`
- Home UI: tabbed tool suite on `/`
- Kubernetes analyzer pipeline: `src/lib/k8s/`
- Helm / Kustomize / NetPol engines: `src/lib/helm/`, `src/lib/kustomize-diff/`, `src/lib/netpol-review/`

## Deployment

1. Import the repo into Vercel (or any Node host).
2. Set `NEXT_PUBLIC_SITE_URL` to your production origin.
3. Build with `pnpm build` and run `pnpm start` (or use Vercel defaults).

No database, auth provider, or server-side YAML processing is required.

## Legal

- [Privacy Policy](/privacy)
- [Terms & Conditions](/terms)

## License

MIT — see [LICENSE](LICENSE).
