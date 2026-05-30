# Production deployment

K8s Readiness **1.0.0** ships four live tools. Deploy as a static Next.js app (Vercel recommended).

## Prerequisites

- Node.js 20+
- pnpm 10.33.1 (see `packageManager` in `package.json`)
- GitHub repository connected to your host

## Vercel (recommended)

1. Import `chayprabs/kubernetes-manifest-readiness-analyzer`.
2. Framework preset: **Next.js** (uses `vercel.json` install/build commands).
3. Set environment variable:
   - `NEXT_PUBLIC_SITE_URL` = your production origin (e.g. `https://k8s-readiness.example.com`)
4. Deploy. Post-deploy smoke:
   - `/`, `/tools`, `/privacy`
   - `/tools/kubernetes-manifest-analyzer`
   - `/tools/helm-values-checker`
   - `/tools/kustomize-output-diff`
   - `/tools/networkpolicy-reviewer`
   - `/robots.txt`, `/sitemap.xml`

## After first deploy

Update `src/lib/deployment.ts`:

- `productionOriginConfigured: true`
- `productionUrl` = deployed origin
- `lastVerifiedAt` = deploy date

Set the GitHub repository **homepage** to the production URL.

## Analytics (optional)

Leave unset for no-op telemetry. To enable:

- `NEXT_PUBLIC_ANALYTICS_ANALYTICS_PROVIDER=custom-endpoint`
- `NEXT_PUBLIC_ANALYTICS_ANALYTICS_ENDPOINT=<reviewed HTTPS endpoint>`

See `.env.example` and `docs/operations/project-decisions.md`.

## Release gate

Before tagging a release:

```bash
pnpm test:ci
```

See `docs/launch/kubernetes-analyzer-launch-checklist.md`.
