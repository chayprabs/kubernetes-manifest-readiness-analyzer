# Adding A New Tool

## Goal

Authos is meant to grow beyond the Kubernetes analyzer. This guide explains the
minimum work required to add a second tool page cleanly through the existing
registry and route structure.

## How The Current Tool Suite Is Wired

The source of truth for live tools is `src/lib/tools/registry.ts`.

That registry currently powers:

- the home page featured-tool section
- the `/tools` catalog page
- tool card metadata
- tool lookup helpers

The main nav is slightly different: it contains a manual shortcut for the first
tool in `src/components/layout/main-nav.tsx`. A new tool will appear in the
catalog automatically, but it will not get a top-level nav link unless you add
one deliberately.

## Step 1: Add The Tool To The Registry

Create a new `ToolDefinition` entry in `src/lib/tools/registry.ts`.

Required fields:

- `id`
- `name`
- `shortName`
- `slug`
- `category`
- `description`
- `shortDescription`
- `tags`
- `audiences`
- `status`
- `seoTitle`
- `seoDescription`
- `relatedToolIds`

Guidance:

- Keep `slug` a valid typed Next.js route literal.
- Write `shortDescription` for cards and catalog pages.
- Write `description` for fuller product context.
- Use truthful `status` values. Do not mark a placeholder as shipped.

Once the registry entry exists, the tool will show up on `/tools` and the home
page sections that read from the registry.

## Step 2: Create The Route

Create a page under `src/app/tools/<your-slug>/page.tsx`.

Minimal pattern:

```ts
import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tools/registry";
import { MyToolApp } from "@/components/tool/my-tool-app";

export const metadata: Metadata = getToolMetadata("my-tool-id");

export default function MyToolPage() {
  return <MyToolApp />;
}
```

Add a `loading.tsx` if the tool benefits from a route-level loading state.

## Step 3: Reuse The Existing Layout And Tool Components

You do not need a new site shell.

Shared infrastructure already exists in:

- `src/components/layout/` for the site header, footer, shell, and page
  containers
- `src/components/ui/` for buttons, cards, tabs, dialogs, selects, alerts, and
  other primitives
- `src/components/tool/` for tool-oriented pieces such as:
  - `ToolCard`
  - `CopyButton`
  - `FileDropzone`
  - `LocalOnlyNotice`
  - keyboard shortcut helpers

Recommended approach:

1. Build the page-specific app component in `src/components/tool/`.
2. Use `Container`, `Card`, `SectionHeading`, and shared primitives first.
3. Only create new reusable components when they are genuinely cross-tool.

## Step 4: Add Metadata And SEO Content

You have two patterns available.

### Registry-derived metadata

For most tools, use `getToolMetadata(id)` from the registry. This keeps title,
description, and keyword maintenance in one place.

### Route-specific metadata and structured data

If the tool needs richer SEO content, follow the Kubernetes analyzer pattern:

- use `createPageMetadata()` directly
- add JSON-LD if it is truthful and useful
- keep product claims limited to what the page actually does

The Kubernetes analyzer page is the reference example for route-specific
metadata and structured data.

## Step 5: Decide Whether The Tool Needs A Direct Nav Link

Adding a tool to the registry does not automatically add it to the primary nav.

If the tool should be directly linked in the header, update
`src/components/layout/main-nav.tsx`. If not, it is still reachable through the
home page and `/tools`.

## Step 6: Add Tests

At minimum:

- add or update a registry test if the new tool changes registry expectations
- add route-level Playwright coverage for the new page
- add unit tests for any non-trivial tool logic

Useful existing examples:

- `src/test/registry.test.ts`
- `tests/e2e/routes.spec.ts`
- the Kubernetes analyzer's unit and e2e suites

## Step 7: Document The Tool

For a production-facing tool, add:

- a product doc in `docs/product/`
- architecture notes if the tool has significant internal logic
- privacy notes if it handles sensitive local input

Keep the docs honest about what is shipped versus planned.

## Privacy Checklist For New Tools

If the new tool handles sensitive material:

- keep raw input in browser memory unless there is a strong reason not to
- do not persist raw input to `localStorage`
- make local-only processing obvious in the UI if that is the product claim
- redact copied or exported content by default when sensitive material is
  plausible
- update `/privacy` and engineering privacy docs if the trust boundary changes

## SEO And Product Checklist

Before shipping a new tool page, verify:

- the registry entry is complete
- the route renders without errors
- metadata is correct for the production domain
- the page title and description match real behavior
- the catalog card copy is understandable without reading the full page
- roadmap links do not masquerade as live tools

## Reference Implementation

Use the Kubernetes analyzer as the reference when you need a concrete example
of:

- a registry entry
- a route with metadata
- a large client-side tool app
- privacy messaging close to the workflow
- browser-worker-backed local analysis
- unit tests, snapshot tests, and Playwright coverage
