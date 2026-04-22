# Authos

Authos is a browser-first developer-tools site. The first tool is a Kubernetes Manifest Production-Readiness Analyzer designed around local browser processing.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS
- ESLint and Prettier
- Vitest for unit tests
- Playwright for end-to-end tests
- No backend database, auth implementation, or paid API dependency

## Run Locally

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

Open [http://localhost:3000](http://localhost:3000) after the dev server starts.

## Available Routes

- `/`
- `/tools`
- `/tools/kubernetes-manifest-analyzer`
- `/privacy`

## Useful Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Product Goal

Build a clean technical foundation for a browser-first developer-tools site, starting with manifest analysis that can stay local to the user's browser.

## Notes

- The Kubernetes analyzer foundation includes a typed rule registry and worker-ready analysis boundary.
- End-to-end tests verify the primary public routes render without errors.
"# kubernetes-manifest-readiness-analyzer" 
