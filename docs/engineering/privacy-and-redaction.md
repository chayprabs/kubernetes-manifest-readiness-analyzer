# Privacy And Redaction

## Privacy Boundary

The shipped Kubernetes analyzer is designed to keep manifest review local to
the browser by default.

Today that means:

- no backend manifest upload path
- no auth system or database tied to analysis
- no raw manifest persistence in `localStorage`
- no requirement for third-party AI or hosted policy APIs

This is a practical product boundary, not a claim that browsers are perfect
secret vaults. Users still operate inside their own browser and machine trust
boundary.

## What Raw Data The App Handles

The app does handle raw manifest content locally.

Raw data may exist in:

- React state in `K8sAnalyzerApp`
- the Monaco editor or textarea fallback
- parsed document objects in `K8sParseResult`
- worker messages between the main thread and the local analysis worker
- export generation code when the user explicitly requests a copied or
  downloaded report

This is necessary for the analyzer to function. The privacy promise is about
where that data stays, not about pretending the raw input never exists.

## What Is Never Sent Or Stored By Default

In the current implementation:

- raw YAML is not sent to a backend service
- raw YAML is not stored in `localStorage`
- settings persistence stores version, profile, namespace filter, and editor
  preferences only
- analytics is a no-op by default unless a public environment variable enables
  an explicit provider
- even when analytics is enabled, event payloads are sanitized down to safe
  aggregate metadata only

Analytics sanitization lives in `src/lib/analytics/events.ts`, and the default
client provider lives in `src/lib/analytics/client.ts`.

Allowed analytics fields are intentionally narrow:

- tool id
- selected profile
- selected Kubernetes version
- input size bucket, not raw input
- document count
- finding counts by severity
- finding counts by category
- analysis duration bucket
- browser locale when already available from the browser

Analytics payloads must never include:

- raw YAML or rendered manifest text
- resource names or namespaces
- labels or annotations
- free-form finding messages
- secret-looking values
- client error stacks or raw exception bodies

## How Privacy Detection Works

Privacy analysis lives in `src/lib/k8s/privacy.ts` and uses shared helpers in
`src/lib/privacy/`.

The analyzer first walks parsed documents and then falls back to raw-text
scanning if parsed signals are unavailable. It flags:

- Secret `data`
- Secret `stringData`
- literal sensitive environment variable values
- sensitive annotations
- cloud credential patterns
- private key markers
- internal hostnames and service-like internal domains

The resulting `K8sPrivacySummary` is attached to the final report and drives UI
warnings plus export redaction behavior.

## Redaction Behavior

Redaction is conservative by default.

### Structured object redaction

When redacting report objects:

- Secret `data` and `stringData` values become `[REDACTED SECRET]`
- sensitive env var literals become `[REDACTED ENV VALUE]`
- sensitive annotations become `[REDACTED ANNOTATION]`
- matching strings such as cloud credentials, private keys, and internal hosts
  are replaced with placeholders

Structured redaction is handled by `redactK8sValueForDisplay()` and the
internal `redactK8sValue()` walker.

### Raw YAML-like text redaction

When only raw text is available, `redactYamlLikeText()` applies a line-based
YAML-aware pass that:

- redacts Secret `data` and `stringData` blocks
- redacts sensitive annotation values
- redacts literal values of sensitive env vars
- redacts known secret-like text patterns anywhere else in the text

This fallback is intentionally heuristic. It is useful, but it should not be
treated as a guarantee that every secret-shaped value is caught.

## Export Behavior

Exports are handled by `src/lib/k8s/report-export.ts`.

Default behavior:

- Markdown export is redacted unless the caller disables redaction
- JSON export is redacted unless the caller disables redaction
- CSV findings export is redacted unless the caller disables redaction
- JSON export excludes raw input unless `includeRawInput: true` is passed

UI behavior:

- the visible report starts with redaction enabled
- the export menu copies or downloads a redacted report by default
- the "Download JSON with manifest" flow requires explicit confirmation
- when redaction is off, the UI warns more clearly before sharing

Important distinction:

- `redactSensitiveOutput: false` means visible and exported content can include
  fuller values
- `includeRawInput: true` means the export can embed raw manifest text

These are separate choices on purpose.

## Maintainer Rules

If you change privacy-sensitive code:

- never store raw YAML in local persistence
- never add network transport for raw manifests without updating privacy docs
  and product claims
- keep redaction on by default for new visible outputs and export surfaces
- do not include original secret values in fix suggestions, examples, or
  snapshots
- test new privacy behavior in `src/lib/k8s/__tests__/privacy.test.ts`,
  `src/lib/privacy/__tests__/`, and export snapshots where relevant

## Honest Limitations

- Redaction is heuristic and may miss novel secret formats.
- Redaction can also over-redact benign internal-looking strings.
- Turning redaction off is intentionally possible for local debugging, which
  means users can choose less-safe output.
- Clipboard, local downloads, and the local browser environment remain the
  user's responsibility once content is copied or saved.
