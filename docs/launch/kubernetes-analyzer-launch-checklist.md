# Kubernetes Analyzer Launch Checklist

## Release Gate

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`

Do not launch if any of the commands above fail.

## QA Checklist

- Homepage copy reads like a product launch, not an internal prototype.
- Tools index links to the Kubernetes analyzer and clearly labels roadmap items
  as coming soon.
- Analyzer page loads on desktop and mobile without layout breakage.
- Empty-state flow explains how to start with paste, upload, or sample data.
- Starter sample loads and produces findings.
- Clipboard paste works when browser permissions are granted.
- File upload and drag-and-drop both load manifests into the editor.
- Invalid YAML shows parse blockers and human-friendly feedback.
- Large drafts show the soft warning and pause auto-analyze before the hard
  browser limit.
- Findings filters, fix copy flows, and exports remain usable after analysis.
- Dark mode stays readable and the severity badges remain distinguishable.
- Keyboard users can trigger the major controls, run analysis, and open exports.

## SEO Checklist

- `NEXT_PUBLIC_SITE_URL` is set correctly in production.
- The analyzer page has a unique title, description, H1, canonical URL, FAQ
  schema, breadcrumb schema, and Open Graph image.
- `robots.txt` and `sitemap.xml` are reachable in the deployed app.
- Landing copy is present in prerendered HTML and not hidden behind an empty
  client shell.
- "Coming soon" links stay on honest roadmap copy rather than fake product
  pages.

## Privacy Checklist

- Raw YAML is never sent over the network for analysis.
- Raw YAML is never stored in `localStorage`.
- Analytics remains disabled unless the public provider env vars are set.
- Analytics payloads contain only safe buckets, counts, selected options, and
  browser locale.
- Secret values stay redacted in visible JSON and default export flows.
- The privacy page and in-product privacy dialog match the current
  implementation.

## Deployment Checklist

- `.env.example` has been reviewed and only contains safe public variables.
- Production sets `NEXT_PUBLIC_SITE_URL` to the real origin.
- Analytics env vars remain unset unless a reviewed safe endpoint is ready.
- No backend, database, or auth setup is required for the core tool.
- Vercel preview and production deployments both pass smoke checks for `/`,
  `/tools`, `/tools/kubernetes-manifest-analyzer`, and `/privacy`.

## Launch Copy Ideas

- "Analyze Kubernetes YAML locally for probes, resources, security context, selectors, and exposure risks before production."
- "Browser-first manifest review with redacted exports by default."
- "No backend roundtrip, no account, no raw manifest analytics by default."

## Rollback Plan

1. Revert the deployment to the last known good build in Vercel or your host.
2. If the issue is metadata or copy only, ship a quick patch instead of
   disabling the analyzer.
3. If a privacy or correctness regression is discovered, remove public links to
   the analyzer route until the fix is deployed.
4. Keep the privacy page updated during rollback if the public behavior changes.
